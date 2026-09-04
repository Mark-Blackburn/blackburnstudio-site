// Blackburn-owned effective-DPI image downsampling runtime. No qpdf source is modified.
// The qualified traversal, eligibility, area-box, JPEG, and mutation implementation is preserved.
#include <qpdf/Buffer.hh>
#include <qpdf/Pl_Flate.hh>
#include <qpdf/QPDF.hh>
#include <qpdf/QPDFExc.hh>
#include <qpdf/QPDFJob.hh>
#include <qpdf/QPDFLogger.hh>
#include <qpdf/QPDFObjectHandle.hh>
#include <qpdf/QPDFPageDocumentHelper.hh>
#include <qpdf/QPDFPageObjectHelper.hh>
#include <qpdf/QPDFWriter.hh>
#include <jpeglib.h>

#include <algorithm>
#include <csetjmp>
#include <cstdint>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <limits>
#include <map>
#include <memory>
#include <set>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

namespace {
constexpr size_t MAX_WIDTH = 6000;
constexpr size_t MAX_HEIGHT = 6000;
constexpr size_t MAX_PIXELS = 24'000'000;
constexpr size_t MAX_RGB_BYTES = 72'000'000;
constexpr int MAX_FORM_DEPTH = 16;
constexpr int TARGET_DPI = 200;
constexpr int JPEG_QUALITY = 75;
constexpr char const* ERROR_FILE = "/blackburn-error-code.txt";

struct Matrix { double a=1,b=0,c=0,d=1,e=0,f=0; };
Matrix multiply(Matrix const& left, Matrix const& right) {
    return {left.a*right.a + left.b*right.c, left.a*right.b + left.b*right.d,
            left.c*right.a + left.d*right.c, left.c*right.b + left.d*right.d,
            left.e*right.a + left.f*right.c + right.e, left.e*right.b + left.f*right.d + right.f};
}
double horizontal(Matrix const& m) { return std::hypot(m.a, m.b); }
double vertical(Matrix const& m) { return std::hypot(m.c, m.d); }
bool finite_positive(double v) { return std::isfinite(v) && v > 0.000001; }
std::string id(QPDFObjectHandle const& object) { return std::to_string(object.getObjectID()) + " " + std::to_string(object.getGeneration()); }

bool checked_rgb_size(uint64_t width, uint64_t height, size_t& decoded_bytes) {
    if (width == 0 || height == 0 || width > MAX_WIDTH || height > MAX_HEIGHT ||
        width > MAX_PIXELS / height) return false;
    uint64_t pixels = width * height;
    if (pixels > MAX_PIXELS || pixels > MAX_RGB_BYTES / 3) return false;
    decoded_bytes = static_cast<size_t>(pixels * 3);
    return true;
}

bool checked_target_dimension(double points, double user_unit, int dpi, int& target) {
    double pixels = points * user_unit / 72.0 * dpi;
    double max_int = static_cast<double>(std::numeric_limits<int>::max());
    if (!finite_positive(pixels) || pixels > max_int) return false;
    double rounded = std::ceil(pixels);
    if (!finite_positive(rounded) || rounded > max_int) return false;
    target = static_cast<int>(rounded);
    return true;
}

struct BlackburnJpegError {
    jpeg_error_mgr manager;
    std::jmp_buf jump;
};

void blackburn_jpeg_error_exit(j_common_ptr common) {
    auto* error = reinterpret_cast<BlackburnJpegError*>(common->err);
    std::longjmp(error->jump, 1);
}

enum class JpegDecodeResult { success, rejected_header, decode_failed };

struct DecodedJpeg {
    unsigned char* pixels;
    size_t bytes;
};

struct JpegDecodeState {
    jpeg_decompress_struct decoder;
    BlackburnJpegError error;
    unsigned char* pixels;
};

// setjmp is intentionally confined to helpers whose mutable state is C-style heap
// storage. A libjpeg longjmp therefore never skips a live C++ object destructor.
JpegDecodeResult decode_jpeg(
    unsigned char const* source,
    size_t source_size,
    int expected_width,
    int expected_height,
    DecodedJpeg& decoded) {
    decoded = {nullptr, 0};
    auto* state = static_cast<JpegDecodeState*>(std::calloc(1, sizeof(JpegDecodeState)));
    if (!state) return JpegDecodeResult::decode_failed;
    state->decoder.err = jpeg_std_error(&state->error.manager);
    state->error.manager.error_exit = blackburn_jpeg_error_exit;
    if (setjmp(state->error.jump)) {
        jpeg_destroy_decompress(&state->decoder);
        std::free(state->pixels);
        std::free(state);
        return JpegDecodeResult::decode_failed;
    }

    jpeg_create_decompress(&state->decoder);
    jpeg_mem_src(&state->decoder, source, source_size);
    if (jpeg_read_header(&state->decoder, TRUE) != JPEG_HEADER_OK) {
        jpeg_destroy_decompress(&state->decoder);
        std::free(state);
        return JpegDecodeResult::decode_failed;
    }

    size_t decoded_bytes = 0;
    if (state->decoder.image_width != static_cast<JDIMENSION>(expected_width) ||
        state->decoder.image_height != static_cast<JDIMENSION>(expected_height) ||
        state->decoder.num_components != 3 ||
        !checked_rgb_size(state->decoder.image_width, state->decoder.image_height, decoded_bytes)) {
        jpeg_destroy_decompress(&state->decoder);
        std::free(state);
        return JpegDecodeResult::rejected_header;
    }

    state->decoder.out_color_space = JCS_RGB;
    if (!jpeg_start_decompress(&state->decoder) ||
        state->decoder.output_width != static_cast<JDIMENSION>(expected_width) ||
        state->decoder.output_height != static_cast<JDIMENSION>(expected_height) ||
        state->decoder.output_components != 3) {
        jpeg_destroy_decompress(&state->decoder);
        std::free(state);
        return JpegDecodeResult::decode_failed;
    }
    state->pixels = static_cast<unsigned char*>(std::malloc(decoded_bytes));
    if (!state->pixels) {
        jpeg_destroy_decompress(&state->decoder);
        std::free(state);
        return JpegDecodeResult::decode_failed;
    }
    while (state->decoder.output_scanline < state->decoder.output_height) {
        JSAMPROW row = state->pixels +
            static_cast<size_t>(state->decoder.output_scanline) * expected_width * 3;
        if (jpeg_read_scanlines(&state->decoder, &row, 1) != 1) {
            jpeg_destroy_decompress(&state->decoder);
            std::free(state->pixels);
            std::free(state);
            return JpegDecodeResult::decode_failed;
        }
    }
    if (!jpeg_finish_decompress(&state->decoder)) {
        jpeg_destroy_decompress(&state->decoder);
        std::free(state->pixels);
        std::free(state);
        return JpegDecodeResult::decode_failed;
    }
    if (state->error.manager.num_warnings != 0) {
        jpeg_destroy_decompress(&state->decoder);
        std::free(state->pixels);
        std::free(state);
        return JpegDecodeResult::decode_failed;
    }
    jpeg_destroy_decompress(&state->decoder);
    decoded = {state->pixels, decoded_bytes};
    state->pixels = nullptr;
    std::free(state);
    return JpegDecodeResult::success;
}

struct JpegEncodeState {
    jpeg_compress_struct encoder;
    BlackburnJpegError error;
    unsigned char* encoded;
    unsigned long encoded_size;
};

bool encode_jpeg(
    unsigned char const* pixels,
    int width,
    int height,
    int quality,
    unsigned char*& encoded,
    size_t& encoded_size) {
    encoded = nullptr;
    encoded_size = 0;
    auto* state = static_cast<JpegEncodeState*>(std::calloc(1, sizeof(JpegEncodeState)));
    if (!state) return false;
    state->encoder.err = jpeg_std_error(&state->error.manager);
    state->error.manager.error_exit = blackburn_jpeg_error_exit;
    if (setjmp(state->error.jump)) {
        jpeg_destroy_compress(&state->encoder);
        std::free(state->encoded);
        std::free(state);
        return false;
    }

    jpeg_create_compress(&state->encoder);
    jpeg_mem_dest(&state->encoder, &state->encoded, &state->encoded_size);
    state->encoder.image_width = width;
    state->encoder.image_height = height;
    state->encoder.input_components = 3;
    state->encoder.in_color_space = JCS_RGB;
    jpeg_set_defaults(&state->encoder);
    jpeg_set_quality(&state->encoder, quality, FALSE);
    state->encoder.comp_info[0].h_samp_factor = 2;
    state->encoder.comp_info[0].v_samp_factor = 2;
    state->encoder.comp_info[1].h_samp_factor = 1;
    state->encoder.comp_info[1].v_samp_factor = 1;
    state->encoder.comp_info[2].h_samp_factor = 1;
    state->encoder.comp_info[2].v_samp_factor = 1;
    state->encoder.optimize_coding = TRUE;
    jpeg_start_compress(&state->encoder, TRUE);
    while (state->encoder.next_scanline < state->encoder.image_height) {
        JSAMPROW row = const_cast<unsigned char*>(
            pixels + static_cast<size_t>(state->encoder.next_scanline) * width * 3);
        if (jpeg_write_scanlines(&state->encoder, &row, 1) != 1) {
            jpeg_destroy_compress(&state->encoder);
            std::free(state->encoded);
            std::free(state);
            return false;
        }
    }
    jpeg_finish_compress(&state->encoder);
    jpeg_destroy_compress(&state->encoder);
    encoded = state->encoded;
    encoded_size = state->encoded_size;
    state->encoded = nullptr;
    std::free(state);
    return true;
}

bool looks_like_jpeg(Buffer const& data) {
    auto const* bytes=data.getBuffer(); size_t size=data.getSize();
    if (size < 4 || bytes[0] != 0xff || bytes[1] != 0xd8) return false;
    size_t at=2; bool saw_frame=false, saw_scan=false;
    while (at < size) {
        if (bytes[at++] != 0xff) return false;
        while (at < size && bytes[at] == 0xff) ++at;
        if (at >= size) return false; unsigned char marker=bytes[at++];
        if (marker == 0xd9) return saw_frame && saw_scan && at == size;
        if (marker == 0xda) { saw_scan=true; break; }
        if (marker == 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
        if (at + 2 > size) return false; size_t length=(bytes[at] << 8) | bytes[at + 1];
        if (length < 2 || at + length > size) return false;
        if ((marker >= 0xc0 && marker <= 0xcf) && marker != 0xc4 && marker != 0xc8 && marker != 0xcc) saw_frame=true;
        at += length;
    }
    if (!saw_frame || !saw_scan) return false;
    while (at + 1 < size) { if (bytes[at] == 0xff && bytes[at + 1] == 0xd9) return at + 2 == size; ++at; }
    return false;
}

struct Placement { double width_points=0, height_points=0, user_unit=1; };
struct ImageRecord {
    QPDFObjectHandle image;
    std::vector<Placement> placements;
    bool unsafe=false;
    std::string reason;
    int width=0,height=0;
    size_t original_bytes=0;
    int target_width=0,target_height=0;
    size_t replacement_bytes=0;
    bool replaced=false;
};
struct Report { int inspected=0, downsampled=0, recompressed=0, skipped=0, unsupported=0, ambiguous=0; size_t decoded_peak=0, decoded_total=0; std::vector<std::string> details; };

class Reducer;
class ContentCallbacks: public QPDFObjectHandle::ParserCallbacks {
  public:
    ContentCallbacks(Reducer& reducer, QPDFObjectHandle resources, Matrix ctm, double user_unit, int depth, std::set<std::string> path): reducer(reducer), resources(resources), ctm(ctm), user_unit(user_unit), depth(depth), path(std::move(path)) {}
    void handleObject(QPDFObjectHandle object) override;
    void handleEOF() override {}
  private:
    Reducer& reducer; QPDFObjectHandle resources; Matrix ctm; double user_unit; int depth; std::set<std::string> path; std::vector<QPDFObjectHandle> operands; std::vector<Matrix> stack;
};

class Reducer {
  public:
    Reducer(int dpi, int quality, bool recompress, bool bilinear): dpi(dpi),quality(quality),recompress(recompress),bilinear(bilinear) {}
    void analyze(QPDF& pdf) {
        int page_number=0;
        for (auto& page: QPDFPageDocumentHelper(pdf).getAllPages()) {
            ++page_number;
            auto resources=page.getAttribute("/Resources", false);
            auto unit=page.getAttribute("/UserUnit", false);
            double user_unit=unit.isNumber()?unit.getNumericValue():1.0;
            if (!finite_positive(user_unit)) { report.details.push_back("page "+std::to_string(page_number)+": invalid UserUnit; skipped page"); continue; }
            inspect_contents(page, resources, Matrix(), user_unit, 0, {});
        }
    }
    void process() {
        for (auto& [key, record]: images) {
            ++report.inspected;
            if (record.unsafe || record.placements.empty()) { skip(record, record.reason.empty()?"ambiguous placement":record.reason, record.unsafe); continue; }
            if (!eligible(record)) continue;
            int max_w=0,max_h=0;
            for (auto const& p:record.placements) {
                int placement_w=0,placement_h=0;
                if (!checked_target_dimension(p.width_points,p.user_unit,dpi,placement_w) ||
                    !checked_target_dimension(p.height_points,p.user_unit,dpi,placement_h)) {
                    record.unsafe=true;record.reason="effective DPI target out of range";++report.ambiguous;break;
                }
                max_w=std::max(max_w,placement_w);
                max_h=std::max(max_h,placement_h);
            }
            if (record.unsafe) { skip(record,record.reason,true);continue; }
            record.target_width=std::min(record.width,std::max(1,max_w)); record.target_height=std::min(record.height,std::max(1,max_h));
            bool reduce = record.target_width <= static_cast<int>(record.width*0.90) || record.target_height <= static_cast<int>(record.height*0.90);
            if (!reduce && !recompress) { skip(record,"resolution already within 10% threshold",false); continue; }
            if (!reduce) { record.target_width=record.width; record.target_height=record.height; }
            replace(record, reduce);
        }
    }
    void inspect_contents(QPDFPageObjectHelper& helper,QPDFObjectHandle resources,Matrix ctm,double unit,int depth,std::set<std::string> path) {
        if (depth>MAX_FORM_DEPTH) { report.details.push_back("form nesting limit reached"); return; }
        ContentCallbacks callback(*this,resources,ctm,unit,depth,std::move(path)); helper.parseContents(&callback);
    }
    void op_do(std::string const& name,QPDFObjectHandle resources,Matrix ctm,double unit,int depth,std::set<std::string> path) {
        auto xobjects=resources.getKey("/XObject"); if (!xobjects.isDictionary()) { report.details.push_back("Do without XObject resources"); return; }
        auto object=xobjects.getKey(name); if (!object.isStream()) { report.details.push_back("unresolved Do "+name); return; }
        if (object.isStreamOfType("/XObject","/Image")) {
            if (!object.isIndirect()) { report.details.push_back("inline/direct image skipped"); return; }
            auto iterator=images.find(id(object));
            if (iterator == images.end()) {
                ImageRecord record;
                record.image=object;
                iterator=images.emplace(id(object),std::move(record)).first;
            }
            auto& rec=iterator->second;
            double w=horizontal(ctm),h=vertical(ctm);
            if (!finite_positive(w)||!finite_positive(h)) { rec.unsafe=true;rec.reason="degenerate transform"; ++report.ambiguous; return; }
            rec.placements.push_back({w,h,unit}); return;
        }
        if (!object.isStreamOfType("/XObject","/Form")) return;
        auto form_id=id(object); if (path.find(form_id) != path.end()) { report.details.push_back("form cycle skipped: "+form_id); return; }
        if (depth>=MAX_FORM_DEPTH) { report.details.push_back("form nesting limit reached"); return; }
        auto dict=object.getDict(); auto form_resources=dict.getKey("/Resources"); if (!form_resources.isDictionary()) form_resources=resources;
        Matrix fm=parse_matrix(dict.getKey("/Matrix")); path.insert(form_id); QPDFPageObjectHelper form(object); inspect_contents(form,form_resources,multiply(ctm,fm),unit,depth+1,std::move(path));
    }
    Report report; std::map<std::string,ImageRecord> images;
  private:
    int dpi,quality; bool recompress,bilinear;
    Matrix parse_matrix(QPDFObjectHandle array) {
        if (!array.isArray()||array.getArrayNItems()!=6) return {}; Matrix m; double* values[]={&m.a,&m.b,&m.c,&m.d,&m.e,&m.f};
        for(int i=0;i<6;++i){auto n=array.getArrayItem(i);if(!n.isNumber())return {};*values[i]=n.getNumericValue();if(!std::isfinite(*values[i]))return {};} return m;
    }
    void skip(ImageRecord& r,std::string const& why,bool unsafe) { ++report.skipped; if(unsafe)++report.unsupported; report.details.push_back(id(r.image)+": "+why); }
    bool eligible(ImageRecord& r) {
        auto d=r.image.getDict(); auto width=d.getKey("/Width"),height=d.getKey("/Height"),bits=d.getKey("/BitsPerComponent"),filter=d.getKey("/Filter"),cs=d.getKey("/ColorSpace");
        if(!width.isInteger()||!height.isInteger()||width.getIntValue()<=0||height.getIntValue()<=0){skip(r,"invalid dimensions",true);return false;}
        size_t decoded_bytes=0;auto width_value=static_cast<uint64_t>(width.getIntValue()),height_value=static_cast<uint64_t>(height.getIntValue());
        if(!checked_rgb_size(width_value,height_value,decoded_bytes)){skip(r,"decoded pixel guard",true);return false;}
        r.width=static_cast<int>(width_value);r.height=static_cast<int>(height_value);
        if(!bits.isInteger()||bits.getIntValue()!=8||!cs.isNameAndEquals("/DeviceRGB")||!filter.isNameAndEquals("/DCTDecode")||d.hasKey("/SMask")||d.hasKey("/Mask")||d.hasKey("/ImageMask")||d.hasKey("/Decode")||d.hasKey("/DecodeParms")){skip(r,"outside DeviceRGB JPEG safe subset",true);return false;}
        auto raw=r.image.getRawStreamData(); r.original_bytes=raw->getSize(); return true;
    }
    static std::vector<unsigned char> box_resize(std::vector<unsigned char> const& source,int sw,int sh,int dw,int dh) {
        std::vector<unsigned char> out(static_cast<size_t>(dw)*dh*3); for(int y=0;y<dh;++y){int y0=y*sh/dh,y1=std::max(y0+1,(y+1)*sh/dh);for(int x=0;x<dw;++x){int x0=x*sw/dw,x1=std::max(x0+1,(x+1)*sw/dw);for(int c=0;c<3;++c){uint64_t sum=0,count=0;for(int sy=y0;sy<y1;++sy)for(int sx=x0;sx<x1;++sx){sum+=source[(static_cast<size_t>(sy)*sw+sx)*3+c];++count;}out[(static_cast<size_t>(y)*dw+x)*3+c]=static_cast<unsigned char>(sum/count);}}}return out;
    }
    static std::vector<unsigned char> bilinear_resize(std::vector<unsigned char> const& s,int sw,int sh,int dw,int dh) {
        std::vector<unsigned char> o(static_cast<size_t>(dw)*dh*3);for(int y=0;y<dh;++y){double fy=(y+.5)*sh/dh-.5;int y0=std::clamp(static_cast<int>(std::floor(fy)),0,sh-1),y1=std::min(y0+1,sh-1);double wy=fy-y0;for(int x=0;x<dw;++x){double fx=(x+.5)*sw/dw-.5;int x0=std::clamp(static_cast<int>(std::floor(fx)),0,sw-1),x1=std::min(x0+1,sw-1);double wx=fx-x0;for(int c=0;c<3;++c){double a=s[(static_cast<size_t>(y0)*sw+x0)*3+c]*(1-wx)+s[(static_cast<size_t>(y0)*sw+x1)*3+c]*wx,b=s[(static_cast<size_t>(y1)*sw+x0)*3+c]*(1-wx)+s[(static_cast<size_t>(y1)*sw+x1)*3+c]*wx;o[(static_cast<size_t>(y)*dw+x)*3+c]=static_cast<unsigned char>(std::clamp(a*(1-wy)+b*wy,0.0,255.0));}}}return o;
    }
    void replace(ImageRecord& r,bool downsample) {
            auto raw=r.image.getRawStreamData();
            if (!looks_like_jpeg(*raw)) { skip(r,"malformed JPEG",true); return; }
            DecodedJpeg decoded{};auto decode_result=decode_jpeg(raw->getBuffer(),raw->getSize(),r.width,r.height,decoded);
            if(decode_result==JpegDecodeResult::rejected_header){skip(r,"JPEG header/dictionary mismatch or limit",true);return;}
            if(decode_result!=JpegDecodeResult::success){skip(r,"JPEG decode failed",true);return;}
            std::unique_ptr<unsigned char,decltype(&std::free)> decoded_owner(decoded.pixels,&std::free);
            report.decoded_total+=decoded.bytes;report.decoded_peak=std::max(report.decoded_peak,decoded.bytes);std::vector<unsigned char> pixels(decoded.pixels,decoded.pixels+decoded.bytes);
            decoded_owner.reset();
            std::vector<unsigned char> resized=downsample?(bilinear?bilinear_resize(pixels,r.width,r.height,r.target_width,r.target_height):box_resize(pixels,r.width,r.height,r.target_width,r.target_height)):std::move(pixels);
            unsigned char* encoded=nullptr;size_t encoded_size=0;if(!encode_jpeg(resized.data(),r.target_width,r.target_height,quality,encoded,encoded_size))throw std::runtime_error("JPEG encoding failed");
            r.replacement_bytes=encoded_size;if(encoded_size>=r.original_bytes){std::free(encoded);skip(r,"replacement is not smaller",false);return;}std::string bytes(reinterpret_cast<char*>(encoded),encoded_size);std::free(encoded);r.image.replaceStreamData(bytes,QPDFObjectHandle::newName("/DCTDecode"),QPDFObjectHandle::newNull());auto d=r.image.getDict();d.replaceKey("/Width",QPDFObjectHandle::newInteger(r.target_width));d.replaceKey("/Height",QPDFObjectHandle::newInteger(r.target_height));d.replaceKey("/BitsPerComponent",QPDFObjectHandle::newInteger(8));d.replaceKey("/ColorSpace",QPDFObjectHandle::newName("/DeviceRGB"));d.removeKey("/DecodeParms");r.replaced=true;if(downsample)++report.downsampled;else ++report.recompressed;
    }
};
void ContentCallbacks::handleObject(QPDFObjectHandle object) {
    if (!object.isOperator()) { operands.push_back(object); return; } std::string op=object.getOperatorValue();
    if(op=="q"){stack.push_back(ctm);} else if(op=="Q"){if(stack.empty()){operands.clear();return;}ctm=stack.back();stack.pop_back();} else if(op=="cm"&&operands.size()==6){Matrix m;double* v[]={&m.a,&m.b,&m.c,&m.d,&m.e,&m.f};bool valid=true;for(int i=0;i<6;++i){if(!operands[i].isNumber()){valid=false;break;}*v[i]=operands[i].getNumericValue();valid&=std::isfinite(*v[i]);}if(valid)ctm=multiply(ctm,m);} else if(op=="Do"&&operands.size()==1&&operands[0].isName()){reducer.op_do(operands[0].getName(),resources,ctm,user_unit,depth,path);} operands.clear();
}

void write_error(std::string const& code) {
    std::ofstream(ERROR_FILE) << code;
}

bool independent_qpdf_check(char const* output) {
    try {
        char const* check_argv[] = {"qpdf", "--check", output, nullptr};
        QPDFJob job;
        std::ostringstream check_output;
        auto logger = QPDFLogger::create();
        logger->setOutputStreams(&check_output, &check_output);
        job.setLogger(logger);
        job.initializeFromArgv(check_argv);
        job.run();
        return job.getExitCode() == 0;
    } catch (...) {
        return false;
    }
}

void usage() {
    std::cerr << "Usage: blackburn_pdf_reducer optimize|reduce-images input.pdf output.pdf\n";
}
}

int main(int argc,char* argv[]) {
    std::remove(ERROR_FILE);
    if(argc!=4){usage();write_error("RUNTIME_FAILED");return 2;}
    std::string mode=argv[1];
    if(mode!="optimize"&&mode!="reduce-images"){usage();write_error("RUNTIME_FAILED");return 2;}
    try {
        QPDF pdf;
        pdf.setSuppressWarnings(true);
        pdf.processFile(argv[2]);
        if(pdf.isEncrypted()){write_error("ENCRYPTED_PDF");return 2;}
        Report report;
        if(mode=="reduce-images"){
            Reducer reducer(TARGET_DPI,JPEG_QUALITY,false,false);
            reducer.analyze(pdf);
            reducer.process();
            report=std::move(reducer.report);
        }
        Pl_Flate::setCompressionLevel(9);
        {
            QPDFWriter writer(pdf,argv[3]);
            writer.setObjectStreamMode(qpdf_o_generate);
            writer.setCompressStreams(true);
            writer.setRecompressFlate(true);
            writer.write();
        }
        std::ifstream output(argv[3],std::ios::binary|std::ios::ate);
        if(!output||output.tellg()<=0){write_error("PROCESSING_FAILED");return 2;}
        output.close();
        if(!independent_qpdf_check(argv[3])){std::remove(argv[3]);write_error("VALIDATION_FAILED");return 2;}
        std::cout<<"BLACKBURN_RESULT {\"mode\":\""<<mode<<"\",\"inspected\":"<<report.inspected<<",\"downsampled\":"<<report.downsampled<<",\"recompressed\":"<<report.recompressed<<",\"skipped\":"<<report.skipped<<",\"unsupported\":"<<report.unsupported<<",\"ambiguous\":"<<report.ambiguous<<",\"decodedPeakBytes\":"<<report.decoded_peak<<",\"decodedTotalBytes\":"<<report.decoded_total<<"}\n";
        return 0;
    } catch(QPDFExc const& e) {
        std::remove(argv[3]);
        write_error(e.getErrorCode()==qpdf_e_password?"ENCRYPTED_PDF":"INVALID_PDF");
        return 2;
    } catch(std::exception const&) {
        std::remove(argv[3]);
        write_error("PROCESSING_FAILED");
        return 2;
    }
}
