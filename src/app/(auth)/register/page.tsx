"use client";
import React, { useState } from "react";
import AuthApi, { AUTH_USERNAME_STORAGE_KEY } from "@/lib/api/auth";
import { extractApiErrorMessage } from "@/lib/errors/api";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, Flex, Alert } from "antd";
import FormItem from "antd/lib/form/FormItem";
import InputPassword from "antd/lib/input/Password";

const DEFAULT_REGISTER_ERROR_MESSAGE = "Failed to register. Please try again.";

export default function Register() {
  const router = useRouter();
  const [registerError, setRegisterError] = useState<string | null>(null);

  const onFinish = (values: { username: string; password: string }) => {
    setRegisterError(null);
    AuthApi.register(values.username, values.password)
      .then(() => {
        window.localStorage.setItem(AUTH_USERNAME_STORAGE_KEY, values.username);
        router.push("/messenger");
      })
      .catch((error: unknown) => {
        setRegisterError(
          extractApiErrorMessage(error, DEFAULT_REGISTER_ERROR_MESSAGE),
        );
      });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
  const onFinishFailed = (errorInfo: any) => {
    console.log("Failed:", errorInfo);
  };

  return (
    <Card title="Register" style={{ width: 400 }}>
      <Form
        name="basic"
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        style={{ maxWidth: 400 }}
        initialValues={{ remember: true }}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
      >
        {registerError ? (
          <FormItem wrapperCol={{ span: 24 }}>
            <Alert type="error" showIcon message={registerError} />
          </FormItem>
        ) : null}
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
          <Button type="link" href="/login">
            Sign in
          </Button>
        </Flex>
      </Form>
    </Card>
  );
}
