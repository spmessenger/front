"use client";
import React, { useState } from "react";
import AuthApi, { AUTH_USERNAME_STORAGE_KEY } from "@/lib/api/auth";
import { extractApiErrorMessage } from "@/lib/errors/api";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, Flex, Alert } from "antd";

const DEFAULT_LOGIN_ERROR_MESSAGE = "Failed to sign in. Please try again.";

export default function Login() {
  const router = useRouter();
  const FormItem = Form.Item;
  const InputPassword = Input.Password;
  const [loginError, setLoginError] = useState<string | null>(null);

  const onFinish = (values: { username: string; password: string }) => {
    setLoginError(null);
    AuthApi.login(values.username, values.password)
      .then(() => {
        window.localStorage.setItem(AUTH_USERNAME_STORAGE_KEY, values.username);
        router.push("/messenger");
      })
      .catch((error: unknown) => {
        setLoginError(
          extractApiErrorMessage(error, DEFAULT_LOGIN_ERROR_MESSAGE),
        );
      });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
  const onFinishFailed = (errorInfo: any) => {
    console.log("Failed:", errorInfo);
  };

  return (
    <div className="auth-mono-page">
      <Card
        className="auth-mono-card"
        title={<span className="auth-mono-text">Sign in</span>}
        style={{ width: "min(440px, 100%)" }}
        styles={{ body: { paddingTop: 22 } }}
      >
        <Form
          className="auth-mono-form"
          name="basic"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          style={{ maxWidth: 400 }}
          initialValues={{ remember: true }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
        >
          {loginError ? (
            <FormItem wrapperCol={{ span: 24 }}>
              <Alert type="error" showIcon message={loginError} />
            </FormItem>
          ) : null}
          <FormItem
            label="Username"
            name="username"
            rules={[{ required: true, message: "Please input your username!" }]}
          >
            <Input placeholder="username" autoComplete="username" />
          </FormItem>
          <FormItem
            label="Password"
            name="password"
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <InputPassword
              placeholder="password"
              autoComplete="current-password"
            />
          </FormItem>
          <Flex justify="space-between">
            <FormItem label={null}>
              <Button
                type="primary"
                htmlType="submit"
                className="auth-mono-text"
              >
                Submit
              </Button>
            </FormItem>
            <Button type="link" href="/register" className="auth-mono-text">
              Register
            </Button>
          </Flex>
        </Form>
      </Card>
    </div>
  );
}
