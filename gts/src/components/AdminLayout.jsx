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
  const [cylinderStats, setCylinderStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Fetch All Admin Dashboard Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          statsRes,
          transactionsRes,
          trendsRes,
          topCompaniesRes,
          cylinderStatsRes,
        ] = await Promise.all([
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
          axios.get(
            "http://localhost:5000/admin/reports/cylinder-movement-summary",
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          ),
        ]);

        setStats(statsRes.data);
        setTransactions(transactionsRes.data);
        setTrends(trendsRes.data);
        setTopCompanies(topCompaniesRes.data);
        setCylinderStats(cylinderStatsRes.data);
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
                    <Title level={4}>Total Transactions</Title>
                    <Text strong>
                      {loading ? (
                        <Spin />
                      ) : (
                        cylinderStats?.total_transactions || 0
                      )}
                    </Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card className="admin-stat-card">
                    <Title level={4}>Unique Cylinders Moved</Title>
                    <Text strong>
                      {loading ? (
                        <Spin />
                      ) : (
                        cylinderStats?.unique_cylinders || 0
                      )}
                    </Text>
                  </Card>
                </Col>
              </Row>

              {/* Top Cylinder Actions */}
              <Card className="cylinder-actions-card">
                <Title level={4}>Top Cylinder Actions</Title>
                {loading ? (
                  <Spin />
                ) : (
                  <List
                    itemLayout="horizontal"
                    dataSource={cylinderStats?.top_actions || []}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={<Text strong>{item.action}</Text>}
                          description={`Total: ${item.count}`}
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>

              {/* Most Active Companies */}
              <Card className="top-companies-card">
                <Title level={4}>Most Active Companies</Title>
                {loading ? (
                  <Spin />
                ) : (
                  <List
                    itemLayout="horizontal"
                    dataSource={cylinderStats?.top_companies || []}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={<Text strong>{item.company_name}</Text>}
                          description={`Transactions: ${item.count}`}
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>

              {/* Recent Transactions */}
              <Card className="recent-transactions-card">
                <Title level={4}>Recent Cylinder Transactions</Title>
                {loading ? (
                  <Spin />
                ) : (
                  <List
                    itemLayout="horizontal"
                    dataSource={transactions.slice(0, 10)} // Limit to 10 transactions
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={<Text strong>{item.action}</Text>}
                          description={`Cylinder: ${
                            item.serial_number
                          } | Date: ${new Date(
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

export default AdminLayout;
