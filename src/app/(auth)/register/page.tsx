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

  const onFinish = (values: { email: string; verificationCode: string }) => {
    setRegisterError(null);
    AuthApi.register(values.email, values.verificationCode)
      .then(() => {
        window.localStorage.setItem(AUTH_USERNAME_STORAGE_KEY, values.email);
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
    <div className="auth-mono-page">
      <Card
        className="auth-mono-card"
        title={<span className="auth-mono-text">Register</span>}
        style={{ width: "min(440px, 100%)" }}
        bodyStyle={{ paddingTop: 22 }}
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
          {registerError ? (
            <FormItem wrapperCol={{ span: 24 }}>
              <Alert type="error" showIcon message={registerError} />
            </FormItem>
          ) : null}
          <FormItem
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Please input your email!" },
              { type: "email", message: "Please enter a valid email!" },
            ]}
          >
            <Input />
          </FormItem>
          <FormItem
            label="Code"
            name="verificationCode"
            initialValue="0000"
            rules={[{ required: true, message: "Please input your verification code!" }]}
          >
            <InputPassword />
          </FormItem>
          <Flex justify="space-between">
            <FormItem label={null}>
              <Button type="primary" htmlType="submit" className="auth-mono-text">
                Submit
              </Button>
            </FormItem>
            <Button type="link" href="/login" className="auth-mono-text">
              Sign in
            </Button>
          </Flex>
        </Form>
      </Card>
    </div>
  );
}
