"use client";
import React, { Fragment } from "react";
import { Layout } from "antd";
import { Content, Header, Footer } from "antd/lib/layout/layout";
import Sider from "antd/lib/layout/Sider";
import ChatsList from "./components/ChatsList";
import ChatGroupsList from "./components/ChatGroupsList";
import ControlPanel from "./components/ControlPanel";
import SearchInput from "./components/SearchInput";
import Modal from "@/components/Modal";

export default function Messenger() {
  return (
    <Fragment>
      <Sider width="5%" style={{ background: "#0c418aff" }}>
        <Header style={{ background: "#1677ff", padding: "0" }}>
          <ControlPanel />
        </Header>
        <Content>
          <ChatGroupsList />
        </Content>
      </Sider>
      <Sider width="25%" style={{ background: "#1677ff" }}>
        <Layout>
          <Header style={{ background: "#1677ff", padding: "0 10px" }}><SearchInput /></Header>
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
      <Modal />
    </Fragment>
  );
}
