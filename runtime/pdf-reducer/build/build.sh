#!/usr/bin/env bash
set -euo pipefail

QPDF_VERSION=12.4.1
QPDF_COMMIT=c37f83ae468abb6cc741f43b2f6fdeb66e550ffb
QPDF_SHA256=f045aa277be2356ff53a89a8622945958291177d2483afc20ede7c8a8cd3873c
ZLIB_COMMIT=51b7f2abdade71cd9bb0e7a373ef2610ec6f9daf
JPEG_TURBO_COMMIT=f29eda648547b36aa594c4116c7764a6c8a079b9
QPDF_URL="https://github.com/qpdf/qpdf/releases/download/v${QPDF_VERSION}/qpdf-${QPDF_VERSION}.tar.gz"
PREFIX=/work/prefix
SRC=/work/upstream
BUILD=/work/native-build
OUT=/work/out

rm -rf "$PREFIX" "$SRC" "$BUILD" "$OUT"
mkdir -p "$PREFIX" "$SRC" "$BUILD" "$OUT"

curl --fail --location --silent --show-error "$QPDF_URL" -o /tmp/qpdf.tar.gz
echo "$QPDF_SHA256  /tmp/qpdf.tar.gz" | sha256sum --check --strict
tar -xzf /tmp/qpdf.tar.gz -C "$SRC"

fetch_commit() {
  local url="$1"
  local commit="$2"
  local destination="$3"
  git init --quiet "$destination"
  git -C "$destination" remote add origin "$url"
  git -C "$destination" fetch --quiet --depth 1 origin "$commit"
  git -C "$destination" checkout --quiet --detach FETCH_HEAD
  test "$(git -C "$destination" rev-parse HEAD)" = "$commit"
  rm -rf "$destination/.git"
}

fetch_commit https://github.com/madler/zlib.git "$ZLIB_COMMIT" "$SRC/zlib"
fetch_commit https://github.com/libjpeg-turbo/libjpeg-turbo.git "$JPEG_TURBO_COMMIT" "$SRC/libjpeg-turbo"

export CFLAGS='-Oz -flto'
export CXXFLAGS='-Oz -flto -fexceptions'

emcmake cmake -S "$SRC/zlib" -B "$BUILD/zlib" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_INSTALL_PREFIX="$PREFIX" \
  -DBUILD_SHARED_LIBS=OFF \
  -DZLIB_BUILD_EXAMPLES=OFF
cmake --build "$BUILD/zlib" --parallel 2
cmake --install "$BUILD/zlib"

emcmake cmake -S "$SRC/libjpeg-turbo" -B "$BUILD/libjpeg-turbo" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_INSTALL_PREFIX="$PREFIX" \
  -DENABLE_SHARED=OFF \
  -DENABLE_STATIC=ON \
  -DWITH_SIMD=OFF \
  -DWITH_JAVA=OFF \
  -DWITH_TURBOJPEG=OFF \
  -DWITH_TOOLS=OFF \
  -DWITH_TESTS=OFF
cmake --build "$BUILD/libjpeg-turbo" --parallel 2
cmake --install "$BUILD/libjpeg-turbo"

emcmake cmake -S "$SRC/qpdf-${QPDF_VERSION}" -B "$BUILD/qpdf" \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=OFF \
  -DBUILD_STATIC_LIBS=ON \
  -DBUILD_DOC=OFF \
  -DINSTALL_MANUAL=OFF \
  -DINSTALL_EXAMPLES=OFF \
  -DINSTALL_CMAKE_PACKAGE=OFF \
  -DINSTALL_PKGCONFIG=OFF \
  -DUSE_IMPLICIT_CRYPTO=OFF \
  -DREQUIRE_CRYPTO_NATIVE=ON \
  -DSKIP_OS_SECURE_RANDOM=ON \
  -DUSE_INSECURE_RANDOM=ON \
  -DZLIB_H_PATH="$PREFIX/include" \
  -DZLIB_LIB_PATH="$PREFIX/lib/libz.a" \
  -DLIBJPEG_H_PATH="$PREFIX/include" \
  -DLIBJPEG_LIB_PATH="$PREFIX/lib/libjpeg.a"
cmake --build "$BUILD/qpdf" --target libqpdf --parallel 2

em++ -std=c++17 -Oz -flto -fexceptions \
  -I"$SRC/qpdf-${QPDF_VERSION}/include" -I"$PREFIX/include" \
  /work/blackburn_pdf_reducer.cpp \
  "$BUILD/qpdf/libqpdf/libqpdf.a" -L"$PREFIX/lib" -lz -ljpeg \
  -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createBlackburnPdfReducer \
  -sINVOKE_RUN=0 -sNO_EXIT_RUNTIME=1 -sALLOW_MEMORY_GROWTH=1 \
  -sINITIAL_MEMORY=67108864 -sMAXIMUM_MEMORY=536870912 \
  -sEXPORTED_RUNTIME_METHODS='["callMain","FS"]' \
  -sENVIRONMENT=web,worker,node -sFILESYSTEM=1 -sDISABLE_EXCEPTION_CATCHING=0 \
  -o "$OUT/pdf-reducer.mjs"

cp /work/pdf-reducer-worker.mjs "$OUT/pdf-reducer-worker.mjs"
cp /work/THIRD_PARTY_NOTICES.md "$OUT/THIRD_PARTY_NOTICES.md"

test "$(grep -o '12.4.1' "$SRC/qpdf-${QPDF_VERSION}/CMakeLists.txt" | head -1)" = "$QPDF_VERSION"
printf '%s\n' "$QPDF_COMMIT" > "$OUT/qpdf-source-commit.txt"
sha256sum "$OUT/pdf-reducer.mjs" "$OUT/pdf-reducer.wasm" "$OUT/pdf-reducer-worker.mjs" "$OUT/THIRD_PARTY_NOTICES.md" > "$OUT/artifacts.sha256"
rm "$OUT/qpdf-source-commit.txt"
