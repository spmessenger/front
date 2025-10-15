"use client";
import { Fragment } from "react";
import { Layout, Flex } from "antd";
import { Content, Header, Footer } from "antd/lib/layout/layout";
import Sider from "antd/lib/layout/Sider";
import ChatsList from "./components/ChatsList";

export default function Messenger() {
  return (
    <Fragment>
      <Sider width="30%" style={{ background: "#1677ff" }}>
        <Layout>
          <Header style={{ background: "#1677ff" }}>Search</Header>
          <Content style={{ background: "#0958d9" }}>
            <ChatsList />
          </Content>
        </Layout>
      </Sider>
      <Layout>
        <Header style={{ background: "#4096ff" }}>Header</Header>
        <Content style={{ background: "#0958d9" }}>Active chat</Content>
        <Footer style={{ background: "#4096ff" }}>Footer</Footer>
      </Layout>
    </Fragment>
  );
}
