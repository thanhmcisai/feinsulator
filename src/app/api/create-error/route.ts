import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageId, error } = body; // error là object chứa bbox, classId...

    if (!imageId || !error) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // Chuẩn bị payload gửi sang Python Server
    const payload = {
      image_id: imageId,
      class_id: error.classId, // Gửi class ID (string)
      bbox: error.bbox,
      status: error.status, // Cờ đánh dấu là do người dùng thêm
    };

    // Gọi Python API (Giả định route)
    const aiServerUrl = "http://192.168.6.88:5555/api/v1/insulator/create-bbox";

    const response = await axios.post(aiServerUrl, payload);

    // Mock response thành công nếu chưa có Python API thực
    return NextResponse.json({
      success: true,
      message: "Thêm lỗi thành công",
      data: response.data, // hoặc response.data
    });
  } catch (error) {
    console.error("Create error failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
