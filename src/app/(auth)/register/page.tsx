"use client";
import React from "react";
import AuthApi from "@/lib/api/auth";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, Flex } from "antd";
import FormItem from "antd/lib/form/FormItem";
import InputPassword from "antd/lib/input/Password";

export default function Register() {
  const router = useRouter();

  const onFinish = (values: { username: string; password: string }) => {
    console.log("Success:", values);
    AuthApi.register(values.username, values.password).then(() =>
      router.push("/messenger")
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
  const onFinishFailed = (errorInfo: any) => {
    console.log("Failed:", errorInfo);
  };

  return (
    <Card title="Регистрация" style={{ width: 400 }}>
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
          label="Имя пользователя"
          name="username"
          rules={[{ required: true, message: "Заполните имя пользователя!" }]}
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
              Отправить
            </Button>
          </FormItem>
          <Button type="link" href="/login">
            Войти
          </Button>
        </Flex>
      </Form>
    </Card>
  );
}
