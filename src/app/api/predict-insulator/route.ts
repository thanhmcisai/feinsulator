import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  AIServerPredictResponse,
  AIServerPredictResult,
  ErrorItem,
} from "@/types";
import axios from "axios";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};

//Cach_dien_thuy_tinh (cách điện thủy tinh)
// tt_vo_mat_bat (cách điện thủy tinh bị vỡ, mất bát)
// tt_ban_phong_dien (cách điện thủy tinh bị bẩn, phóng điện)
// cach_dien_polyme (cách điện polymer)
// polyme_ban_phong_dien (cách điện polymer bị bắn phóng điện)
// polyme_rach (cách điện polymer bị rách)
// polyme_cong_venh (cách điện polymer bị cong, vênh)
// chong_set_van (chống sét van)
// van_ban (chống sét van bị bẩn)
// van_phong_dien_bien_dang (chống sét van bị phóng điện, biến dạng)
// van_ran_rach_tan (chống sét van bị rạn, rách tán)
// day_dan (dây dẫn)
// day_tua_dut_soi (dây dẫn bị tưa, đứt sợi)
// day_vat_la_bam (dây dẫn bị vật lạ bấm vào)
// day_ban_phong_dien (dây dẫn bị bẩn, phóng điện)
// ta_chong_rung (tạ chống rung)
// ta_chong_rung_ri_set (tạ chống rung bị rỉ sét)
// mat_ta (tạ chống rung bị mất tạ)
// mat_bulong (tạ chống rung bị mất bulong)
// khoa_do_khoa_neo ((khóa đỡ, khóa néo)

const CLASSES: Record<string, string> = {
  cach_dien_polyme: "Cách điện polyme",
  cach_dien_thuy_tinh: "Cách điện thủy tinh",
  chong_set_van: "Chống sét van",
  day_dan: "Dây dẫn",
  ta_chong_rung: "Tạ chống rung",
  tt_ban_phong_dien: "Cách điện thuỷ tinh bẩn phóng điện",
  tt_vo_mat_bat: "Cách điện thuỷ tinh vỡ mất bát",
  van_ban: "Chống sét van bị bẩn",
  day_ban_phong_dien: "Dây dẫn bị bẩn, phóng điện",
  van_phong_dien_bien_dang: "Chống sét van bị phóng điện, biến dạng",
  day_tua_dut_soi: "Dây dẫn bị tưa, đứt sợi",
  day_vat_la_bam: "Dây dẫn bị vật lạ bám vào",
  ta_chong_rung_ri_set: "Tạ chống rung bị rỉ sét",
  long_bulong: "Lỏng bulong",
  mat_bulong: "Mất bulong",
  mat_ta: "Mất tạ",
  polyme_ban_phong_dien: "Cách điện polymer bị bẩn phóng điện",
  polyme_cong_venh: "Cách điện polymer bị cong vênh",
  polyme_rach: "Cách điện polymer bị rách",
  van_ran_rach_tan: "Chống sét van bị rạn, rách tán",
};

// type ColorsKey = 'damaged_cap' | 'insulator' | 'missing_cap' | 'default';

function getRandomColor(index: number, type: string) {
  const colors = {
    cach_dien_polyme: [
      { stroke: "#00FF66", fill: "rgba(0, 255, 102, 0.2)" },
      { stroke: "#00CC52", fill: "rgba(0, 204, 82, 0.2)" },
      { stroke: "#33FF80", fill: "rgba(51, 255, 128, 0.2)" },
      { stroke: "#009940", fill: "rgba(0, 153, 64, 0.2)" },
    ],
    cach_dien_thuy_tinh: [
      { stroke: "#00CCFF", fill: "rgba(0, 204, 255, 0.2)" },
      { stroke: "#00A3CC", fill: "rgba(0, 163, 204, 0.2)" },
      { stroke: "#33D6FF", fill: "rgba(51, 214, 255, 0.2)" },
      { stroke: "#008099", fill: "rgba(0, 128, 153, 0.2)" },
    ],
    chong_set_van: [
      { stroke: "#3366FF", fill: "rgba(51, 102, 255, 0.2)" },
      { stroke: "#2952CC", fill: "rgba(41, 82, 204, 0.2)" },
      { stroke: "#5C85FF", fill: "rgba(92, 133, 255, 0.2)" },
      { stroke: "#1F3D99", fill: "rgba(31, 61, 153, 0.2)" },
    ],
    day_dan: [
      { stroke: "#6600FF", fill: "rgba(102, 0, 255, 0.2)" },
      { stroke: "#5200CC", fill: "rgba(82, 0, 204, 0.2)" },
      { stroke: "#8033FF", fill: "rgba(128, 51, 255, 0.2)" },
      { stroke: "#400099", fill: "rgba(64, 0, 153, 0.2)" },
    ],
    ta_chong_rung: [
      { stroke: "#0099FF", fill: "rgba(0, 153, 255, 0.2)" },
      { stroke: "#007ACC", fill: "rgba(0, 122, 204, 0.2)" },
      { stroke: "#33ADFF", fill: "rgba(51, 173, 255, 0.2)" },
      { stroke: "#005C99", fill: "rgba(0, 92, 153, 0.2)" },
    ],
    tt_ban_phong_dien: [
      { stroke: "#9900CC", fill: "rgba(153, 0, 204, 0.2)" },
      { stroke: "#7700A3", fill: "rgba(119, 0, 163, 0.2)" },
      { stroke: "#B833E6", fill: "rgba(184, 51, 230, 0.2)" },
      { stroke: "#660099", fill: "rgba(102, 0, 153, 0.2)" },
    ],
    tt_vo_mat_bat: [
      { stroke: "#FF6600", fill: "rgba(255, 102, 0, 0.2)" },
      { stroke: "#CC5200", fill: "rgba(204, 82, 0, 0.2)" },
      { stroke: "#FF8033", fill: "rgba(255, 128, 51, 0.2)" },
      { stroke: "#994000", fill: "rgba(153, 64, 0, 0.2)" },
    ],
    van_ban: [
      { stroke: "#FF9900", fill: "rgba(255, 153, 0, 0.2)" },
      { stroke: "#CC7A00", fill: "rgba(204, 122, 0, 0.2)" },
      { stroke: "#FFAD33", fill: "rgba(255, 173, 51, 0.2)" },
      { stroke: "#995C00", fill: "rgba(153, 92, 0, 0.2)" },
    ],
    day_ban_phong_dien: [
      { stroke: "#FF6699", fill: "rgba(255, 102, 153, 0.2)" },
      { stroke: "#CC527A", fill: "rgba(204, 82, 122, 0.2)" },
      { stroke: "#FF85AD", fill: "rgba(255, 133, 173, 0.2)" },
      { stroke: "#993D5C", fill: "rgba(153, 61, 92, 0.2)" },
    ],
    van_phong_dien_bien_dang: [
      { stroke: "#CC0066", fill: "rgba(204, 0, 102, 0.2)" },
      { stroke: "#A30052", fill: "rgba(163, 0, 82, 0.2)" },
      { stroke: "#E63385", fill: "rgba(230, 51, 133, 0.2)" },
      { stroke: "#800040", fill: "rgba(128, 0, 64, 0.2)" },
    ],
    day_tua_dut_soi: [
      { stroke: "#FF0066", fill: "rgba(255, 0, 102, 0.2)" },
      { stroke: "#CC0052", fill: "rgba(204, 0, 82, 0.2)" },
      { stroke: "#FF3385", fill: "rgba(255, 51, 133, 0.2)" },
      { stroke: "#990040", fill: "rgba(153, 0, 64, 0.2)" },
    ],
    day_vat_la_bam: [
      { stroke: "#99FF00", fill: "rgba(153, 255, 0, 0.2)" },
      { stroke: "#7ACC00", fill: "rgba(122, 204, 0, 0.2)" },
      { stroke: "#ADFF33", fill: "rgba(173, 255, 51, 0.2)" },
      { stroke: "#5C9900", fill: "rgba(92, 153, 0, 0.2)" },
    ],
    ta_chong_rung_ri_set: [
      { stroke: "#CC6600", fill: "rgba(204, 102, 0, 0.2)" },
      { stroke: "#A35200", fill: "rgba(163, 82, 0, 0.2)" },
      { stroke: "#E68033", fill: "rgba(230, 128, 51, 0.2)" },
      { stroke: "#804000", fill: "rgba(128, 64, 0, 0.2)" },
    ],
    long_bulong: [
      { stroke: "#0099CC", fill: "rgba(0, 153, 204, 0.2)" },
      { stroke: "#007A99", fill: "rgba(0, 122, 153, 0.2)" },
      { stroke: "#33ADD6", fill: "rgba(51, 173, 214, 0.2)" },
      { stroke: "#005C73", fill: "rgba(0, 92, 115, 0.2)" },
    ],
    mat_bulong: [
      { stroke: "#00FF99", fill: "rgba(0, 255, 153, 0.2)" },
      { stroke: "#00CC7A", fill: "rgba(0, 204, 122, 0.2)" },
      { stroke: "#33FFAD", fill: "rgba(51, 255, 173, 0.2)" },
      { stroke: "#00995C", fill: "rgba(0, 153, 92, 0.2)" },
    ],
    mat_ta: [
      { stroke: "#9933FF", fill: "rgba(153, 51, 255, 0.2)" },
      { stroke: "#7A29CC", fill: "rgba(122, 41, 204, 0.2)" },
      { stroke: "#AD5CFF", fill: "rgba(173, 92, 255, 0.2)" },
      { stroke: "#5C1F99", fill: "rgba(92, 31, 153, 0.2)" },
    ],
    polyme_cong_venh: [
      { stroke: "#66FF00", fill: "rgba(102, 255, 0, 0.2)" },
      { stroke: "#52CC00", fill: "rgba(82, 204, 0, 0.2)" },
      { stroke: "#80FF33", fill: "rgba(128, 255, 51, 0.2)" },
      { stroke: "#409900", fill: "rgba(64, 153, 0, 0.2)" },
    ],
    polyme_ban_phong_dien: [
      { stroke: "#FF3366", fill: "rgba(255, 51, 102, 0.2)" },
      { stroke: "#CC2952", fill: "rgba(204, 41, 82, 0.2)" },
      { stroke: "#FF5C85", fill: "rgba(255, 92, 133, 0.2)" },
      { stroke: "#991F3D", fill: "rgba(153, 31, 61, 0.2)" },
    ],
    polyme_rach: [
      { stroke: "#FFCC00", fill: "rgba(255, 204, 0, 0.2)" },
      { stroke: "#CCA300", fill: "rgba(204, 163, 0, 0.2)" },
      { stroke: "#FFD633", fill: "rgba(255, 214, 51, 0.2)" },
      { stroke: "#997A00", fill: "rgba(153, 122, 0, 0.2)" },
    ],
    van_ran_rach_tan: [
      { stroke: "#00FFCC", fill: "rgba(0, 255, 204, 0.2)" },
      { stroke: "#00CCA3", fill: "rgba(0, 204, 163, 0.2)" },
      { stroke: "#33FFD6", fill: "rgba(51, 255, 214, 0.2)" },
      { stroke: "#00997A", fill: "rgba(0, 153, 122, 0.2)" },
    ],
    default: [
      { stroke: "#888888", fill: "rgba(136, 136, 136, 0.2)" },
      { stroke: "#666666", fill: "rgba(102, 102, 102, 0.2)" },
      { stroke: "#AAAAAA", fill: "rgba(170, 170, 170, 0.2)" },
      { stroke: "#555555", fill: "rgba(85, 85, 85, 0.2)" },
    ],
  };

  const key = (type in colors ? type : "default") as keyof typeof colors;
  return colors[key][Math.floor(Math.random() * colors[key].length)];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json(
        {
          error: "Không tìm thấy file ảnh",
          detail: 'Vui lòng gửi file ảnh với field name là "image"',
        },
        { status: 400 }
      );
    }

    // Kiểm tra MIME type
    if (file.type !== "image/jpeg") {
      return NextResponse.json(
        {
          error: "Định dạng file không hợp lệ",
          detail: "Chỉ chấp nhận file JPEG",
        },
        { status: 400 }
      );
    }
    // Tạo FormData mới để gửi đến API bên ngoài
    const externalFormData = new FormData();
    externalFormData.append("image", file);

    // Gửi request đến API bên ngoài
    const response = await axios.post(
      `${process.env.AI_SERVER_URL}/api/v1/insulator_api/predict`,
      externalFormData
    );
    const data: AIServerPredictResponse = response.data;
    // 1. Tạo ID cho bức ảnh (Giả lập ID từ DB nếu AI Server không trả về)
    // Nếu AI Server có trả về ID ảnh (ví dụ data.image_id), hãy dùng nó:
    const imageId = data.image_id || uuidv4();

    const errors: ErrorItem[] = (data.results || []).map(
      (record: AIServerPredictResult, index: number) => {
        const classId = record.class_id; // Index 5 là class id
        const confidence = record.confidence; // Index 4 là confidence
        const className = CLASSES[classId] || "Unknown"; // Map tên lỗi
        const errorId = record.bbox_id; // Tạo ID duy nhất cho mỗi lỗi
        const bbox = record.bbox; // Lấy bbox từ record
        const status = record.status;

        return {
          index: index,
          id: errorId, // Tạo ID duy nhất cho lỗi
          name: className,
          description: confidence.toString(), // Lưu confidence dạng string vào description để hiển thị %
          classId: classId,
          confidence: confidence,
          bbox: bbox,
          color: getRandomColor(index, classId),
          status: status,
        };
      }
    );
    // 3. Trả về đúng cấu trúc PredictResponse
    return NextResponse.json({
      imageId: imageId,
      errors: errors,
    });
  } catch (error) {
    console.error("Lỗi khi xử lý file:", error);
    return NextResponse.json(
      {
        error: "Lỗi khi xử lý file",
        detail: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
