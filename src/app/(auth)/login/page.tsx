"use client";
import React from "react";
import AuthApi, { AUTH_USERNAME_STORAGE_KEY } from "@/lib/api/auth";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, Flex } from "antd";
import FormItem from "antd/lib/form/FormItem";
import InputPassword from "antd/lib/input/Password";

export default function Login() {
  const router = useRouter();

  const onFinish = (values: { username: string; password: string }) => {
    AuthApi.login(values.username, values.password).then(() => {
      window.localStorage.setItem(AUTH_USERNAME_STORAGE_KEY, values.username);
      router.push("/messenger");
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
  const onFinishFailed = (errorInfo: any) => {
    console.log("Failed:", errorInfo);
  };

  return (
    <Card title="Sign in" style={{ width: 400 }}>
      <Form
        name="basic"
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        style={{ maxWidth: 400 }}
        initialValues={{ remember: true }}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
      >
        <FormItem
          label="Username"
          name="username"
          rules={[{ required: true, message: "Please input your username!" }]}
        >
          <Input />
        </FormItem>
        <FormItem
          label="Password"
          name="password"
          rules={[{ required: true, message: "Please input your password!" }]}
        >
          <InputPassword />
        </FormItem>
        <Flex justify="space-between">
          <FormItem label={null}>
            <Button type="primary" htmlType="submit">
              Submit
            </Button>
          </FormItem>
          <Button type="link" href="/register">
            Register
          </Button>
        </Flex>
      </Form>
    </Card>
  );
}
