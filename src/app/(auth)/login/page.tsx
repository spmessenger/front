"use client";
import React, { useState } from "react";
import AuthApi, { AUTH_USERNAME_STORAGE_KEY } from "@/lib/api/auth";
import { extractApiErrorMessage } from "@/lib/errors/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, Flex, Alert } from "antd";
import type { FormProps } from "antd";

const DEFAULT_LOGIN_ERROR_MESSAGE = "Failed to sign in. Please try again.";
type AuthFormValues = { username: string; password: string };

export default function Login() {
  const router = useRouter();
  const FormItem = Form.Item;
  const InputPassword = Input.Password;
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFinish = (values: AuthFormValues) => {
    setLoginError(null);
    setLoading(true);
    AuthApi.login(values.username, values.password)
      .then(() => {
        window.localStorage.setItem(AUTH_USERNAME_STORAGE_KEY, values.username);
        router.push("/messenger");
        setLoading(false);
      })
      .catch((error: unknown) => {
        setLoginError(
          extractApiErrorMessage(error, DEFAULT_LOGIN_ERROR_MESSAGE),
        );
        setLoading(false);
      });
  };

  const onFinishFailed: FormProps<AuthFormValues>["onFinishFailed"] = () =>
    undefined;

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
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
        >
          {loginError && (
            <FormItem wrapperCol={{ span: 24 }}>
              <Alert type="error" showIcon message={loginError} />
            </FormItem>
          )}
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
                loading={loading}
              >
                Submit
              </Button>
            </FormItem>
            <Link href="/register" className="auth-mono-text">
              Register
            </Link>
          </Flex>
        </Form>
      </Card>
    </div>
  );
}
