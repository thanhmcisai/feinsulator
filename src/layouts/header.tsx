'use client';

import { Row, Col, Typography } from 'antd';
import Image from 'next/image';

const { Title } = Typography;

export default function HeaderBar() {
  return (
    <header style={{ background: '#fff', padding: 0,zIndex: 1000,display: "fixed",width: "100%" }}>
      <Row align="middle" justify="space-between">
        <Col>
          <Image src="/logo_env.png" width={150} height={60} alt="EVN" style={{ margin: 16, height: 60 }} />
        </Col>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0, color: '#003399', textAlign: 'center' }}>
            HỆ THỐNG NHẬN DIỆN PHÂN LOẠI LỖI CỦA SỨ THỦY TINH<br />CÁCH ĐIỆN TRÊN ĐƯỜNG DÂY 110 KV
          </Title>
        </Col>
        <Col>
          <Image src="/logo-mq.png" width={200} height={60} alt="MQ ICT" style={{ margin: 16, height: 60 }} />
        </Col>
      </Row>
    </header>
  );
}