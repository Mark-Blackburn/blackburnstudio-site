FROM emscripten/emsdk@sha256:a424cb920e13a48547f71a87b992018d161e7415db984c88bcb99f9efa5e4e7e AS build

ARG BUILD_VARIANT=production
ENV SOURCE_DATE_EPOCH=1756684800
WORKDIR /work

COPY runtime/pdf-reducer/build/build.sh /work/build.sh
COPY runtime/pdf-reducer/src/blackburn_pdf_reducer.cpp /work/blackburn_pdf_reducer.cpp
COPY runtime/pdf-reducer/worker/pdf-reducer-worker.mjs /work/pdf-reducer-worker.mjs
COPY runtime/pdf-reducer/THIRD_PARTY_NOTICES.md /work/THIRD_PARTY_NOTICES.md

RUN test -n "$BUILD_VARIANT" && bash /work/build.sh

FROM scratch AS export
COPY --from=build /work/out/ /
