import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: NextRequest) {
  try {
    // 1. Parse body từ Client gửi lên
    const body = await request.json();
    const { imageId, errorId, status, bbox, classId } = body;

    // 2. Validate dữ liệu cơ bản
    if (!imageId || !errorId) {
      return NextResponse.json(
        { error: "Thiếu thông tin imageId hoặc errorId" },
        { status: 400 }
      );
    }

    const payload = {
      image_id: imageId,
      bbox_id: errorId,
      class_id: classId, // Tên class dạng string (nếu user đổi class)
      bbox: bbox, // [x1, y1, x2, y2] - Tọa độ mới (nếu có chỉnh sửa)
      status: status, // "accepted" | "rejected" | null
    };

    // 4. Gọi API Backend (Python/Flask) để cập nhật Database
    // Lưu ý: Bạn cần thay đổi đường dẫn '/api/v1/update_bbox' theo đúng API của bên Python
    const aiServerUrl = "http://192.168.6.88:5555/api/v1/insulator/update-bbox";

    const response = await axios.put(aiServerUrl, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    // 5. Trả kết quả về cho Client
    return NextResponse.json({
      success: true,
      message: "Cập nhật trạng thái thành công",
      data: response.data,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái lỗi:", error);

    // Xử lý lỗi từ Axios (lỗi từ AI Server trả về)
    if (axios.isAxiosError(error) && error.response) {
      return NextResponse.json(
        {
          error: "Lỗi từ AI Server",
          detail: error.response.data,
        },
        { status: error.response.status }
      );
    }

    return NextResponse.json(
      {
        error: "Lỗi Server Internal",
        detail: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
