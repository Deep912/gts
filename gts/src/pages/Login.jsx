import { useState } from "react";
import { Form, Input, Button, Card, message, Typography, Spin } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import axios from "axios";
import "../styles/Login.css";

const { Title } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values) => {
    console.log("🔹 Attempting login with:", values);
    setLoading(true);

    try {
      const response = await axios.post("http://localhost:5000/login", values);

      console.log("🔹 API Response:", response.data);

      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("username", response.data.user.username);
        localStorage.setItem("role", response.data.user.role);

        message.success("Login successful!");

        setTimeout(() => {
          window.location.href =
            response.data.user.role === "admin"
              ? "/admin/dashboard"
              : "/worker/";
        }, 500);
      } else {
        message.error("Invalid credentials.");
      }
    } catch (error) {
      console.error("🔹 Login Error:", error);
      message.error("Incorrect username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <Title level={2} className="login-title">
          Welcome Back
        </Title>

        <Form name="login-form" onFinish={handleLogin} layout="vertical">
          <Form.Item
            name="username"
            rules={[{ required: true, message: "Enter your username" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Username"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Enter your password" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            className="login-button"
            loading={loading}
            block
          >
            {loading ? <Spin /> : "Login"}
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
