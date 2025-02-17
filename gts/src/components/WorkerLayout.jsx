import {
  Layout,
  Menu,
  Button,
  Row,
  Col,
  Card,
  Typography,
  List,
  Spin,
} from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  UploadOutlined,
  DownloadOutlined,
  RetweetOutlined,
  LogoutOutlined,
  UserOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import axios from "axios";
import "../styles/WorkerLayout.css";
import { useState, useEffect } from "react";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const WorkerLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const username = localStorage.getItem("username") || "Worker";

  // State for recent transactions
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch recent transactions
    axios
      .get("http://localhost:5000/worker/transactions", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((response) => {
        setTransactions(response.data);
      })
      .catch(() => console.error("Error fetching transactions"))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");

    setTimeout(() => {
      window.location.href = "/";
    }, 100); // Small delay ensures smooth transition
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sider collapsible className="worker-sidebar">
        <div className="worker-logo">🚀 Worker Panel</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          items={[
            {
              key: "/worker/dispatch",
              icon: <UploadOutlined />,
              label: "Dispatch Cylinders",
            },
            {
              key: "/worker/receive",
              icon: <DownloadOutlined />,
              label: "Receive Cylinders",
            },
            {
              key: "/worker/refill",
              icon: <RetweetOutlined />,
              label: "Refill Cylinders",
            },
            {
              key: "/worker/complete-refill",
              icon: <CheckOutlined />,
              label: "Complete Refill",
            },
          ]}
        />
      </Sider>

      {/* Main Layout */}
      <Layout>
        <Header className="worker-header">
          <div className="header-left">
            <UserOutlined /> <span>Welcome, {username}</span>
          </div>
          <Button
            type="primary"
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Header>

        <Content className="worker-content">
          {location.pathname === "/worker/" && (
            <>
              {/* Quick Action Cards */}
              <Row
                gutter={[16, 16]}
                justify="center"
                style={{ marginBottom: "20px" }}
              >
                <Col xs={24} sm={8}>
                  <Card
                    hoverable
                    className="worker-small-card"
                    onClick={() => navigate("/worker/dispatch")}
                  >
                    <UploadOutlined className="small-card-icon" />
                    <h3>Dispatch Cylinders</h3>
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card
                    hoverable
                    className="worker-small-card"
                    onClick={() => navigate("/worker/receive")}
                  >
                    <DownloadOutlined className="small-card-icon" />
                    <h3>Receive Cylinders</h3>
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card
                    hoverable
                    className="worker-small-card"
                    onClick={() => navigate("/worker/refill")}
                  >
                    <RetweetOutlined className="small-card-icon" />
                    <h3>Refill Cylinders</h3>
                  </Card>
                </Col>
              </Row>

              {/* Recent Transactions */}
              <Card className="recent-transactions-card">
                <Title level={4}>Recent Transactions</Title>
                {loading ? (
                  <Spin />
                ) : (
                  <List
                    itemLayout="horizontal"
                    dataSource={transactions}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<CheckOutlined />}
                          title={
                            <Text strong>
                              {item.action.charAt(0).toUpperCase() +
                                item.action.slice(1)}
                            </Text>
                          }
                          description={`Cylinder ID: ${
                            item.cylinder_id
                          } | Company: ${item.company_name} | ${new Date(
                            item.timestamp
                          ).toLocaleString()}`}
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </>
          )}

          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default WorkerLayout;
