import { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Button,
  Card,
  Row,
  Col,
  Typography,
  Spin,
  List,
} from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  DashboardOutlined,
  DatabaseOutlined,
  ApartmentOutlined,
  BarChartOutlined,
  LogoutOutlined,
  UserOutlined,
} from "@ant-design/icons";
import axios from "axios";
import "../styles/AdminLayout.css";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const username = localStorage.getItem("username") || "Admin";

  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [trends, setTrends] = useState([]);
  const [topCompanies, setTopCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Fetch Admin Dashboard Data (All APIs in One Call)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, transactionsRes, trendsRes, topCompaniesRes] =
          await Promise.all([
            axios.get("http://localhost:5000/admin/stats", {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }),
            axios.get("http://localhost:5000/admin/transactions", {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }),
            axios.get("http://localhost:5000/admin/trends", {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }),
            axios.get("http://localhost:5000/admin/top-companies", {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }),
          ]);

        setStats(statsRes.data);
        setTransactions(transactionsRes.data);
        setTrends(trendsRes.data);
        setTopCompanies(topCompaniesRes.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
    window.location.reload();
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sider collapsible className="admin-sidebar">
        <div className="admin-logo">🛠️ Admin Panel</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={[
            {
              key: "/admin/dashboard",
              icon: <DashboardOutlined />,
              label: "Dashboard",
              onClick: () => navigate("/admin/dashboard"),
            },
            {
              key: "/admin/cylinders",
              icon: <DatabaseOutlined />,
              label: "Cylinders",
              onClick: () => navigate("/admin/cylinders"),
            },
            {
              key: "/admin/companies",
              icon: <ApartmentOutlined />,
              label: "Companies",
              onClick: () => navigate("/admin/companies"),
            },
            {
              key: "/admin/reports",
              icon: <BarChartOutlined />,
              label: "Reports",
              onClick: () => navigate("/admin/reports"),
            },
          ]}
        />
      </Sider>

      {/* Main Layout */}
      <Layout>
        <Header className="admin-header">
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

        <Content className="admin-content">
          {location.pathname === "/admin/dashboard" && (
            <>
              {/* Quick Overview Cards */}
              <Row
                gutter={[16, 16]}
                justify="center"
                style={{ marginBottom: "20px" }}
              >
                <Col xs={24} sm={12} md={6}>
                  <Card className="admin-stat-card">
                    <Title level={4}>Total Cylinders</Title>
                    <Text strong>
                      {loading ? <Spin /> : stats?.total_cylinders || 0}
                    </Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card className="admin-stat-card">
                    <Title level={4}>In Inventory</Title>
                    <Text strong>
                      {loading ? <Spin /> : stats?.inventory_cylinders || 0}
                    </Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card className="admin-stat-card">
                    <Title level={4}>Dispatched</Title>
                    <Text strong>
                      {loading ? <Spin /> : stats?.total_dispatched || 0}
                    </Text>
                  </Card>
                </Col>
              </Row>

              {/* Additional Stats */}
              <Row
                gutter={[16, 16]}
                justify="center"
                style={{ marginBottom: "20px" }}
              >
                <Col xs={24} sm={12} md={6}>
                  <Card className="admin-stat-card">
                    <Title level={4}>Refilled Cylinders</Title>
                    <Text strong>
                      {loading ? <Spin /> : stats?.total_refilled || 0}
                    </Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card className="admin-stat-card">
                    <Title level={4}>Currently Refilling</Title>
                    <Text strong>
                      {loading ? <Spin /> : stats?.refilling_cylinders || 0}
                    </Text>
                  </Card>
                </Col>
              </Row>

              {/* Trends (Refill & Dispatch) */}
              <Card className="trends-card">
                <Title level={4}>Refill & Dispatch Trends (Last 7 Days)</Title>
                {loading ? (
                  <Spin />
                ) : (
                  <List
                    itemLayout="horizontal"
                    dataSource={trends}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Text strong>
                              {new Date(item.date).toDateString()}
                            </Text>
                          }
                          description={`Refilled: ${item.refilled} | Dispatched: ${item.dispatched}`}
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>

              {/* Top Companies by Transactions */}
              <Card className="top-companies-card">
                <Title level={4}>Top 5 Companies by Transactions</Title>
                {loading ? (
                  <Spin />
                ) : (
                  <List
                    itemLayout="horizontal"
                    dataSource={topCompanies}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={<Text strong>{item.company_name}</Text>}
                          description={`Total Transactions: ${item.total_transactions}`}
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>

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
                          title={
                            <Text strong>
                              {item.action.charAt(0).toUpperCase() +
                                item.action.slice(1)}
                            </Text>
                          }
                          description={`Cylinder: ${item.serial_number} | Company: ${item.company_name}`}
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

export default AdminLayout;
