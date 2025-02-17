import { Layout, Menu } from "antd";
import { Outlet, useNavigate } from "react-router-dom";
import {
  HomeOutlined,
  DatabaseOutlined,
  TeamOutlined,
  BarChartOutlined,
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;

const AdminLayout = () => {
  const navigate = useNavigate();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider collapsible>
        <div className="logo">GTS Admin</div>
        <Menu theme="dark" mode="inline" onClick={({ key }) => navigate(key)}>
          <Menu.Item key="/admin/dashboard" icon={<HomeOutlined />}>
            Dashboard
          </Menu.Item>
          <Menu.Item key="/admin/cylinders" icon={<DatabaseOutlined />}>
            Cylinders
          </Menu.Item>
          <Menu.Item key="/admin/companies" icon={<TeamOutlined />}>
            Companies
          </Menu.Item>
          <Menu.Item key="/admin/reports" icon={<BarChartOutlined />}>
            Reports
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Header style={{ background: "#fff", padding: 16 }}>Admin Panel</Header>
        <Content
          style={{ margin: "16px", padding: "16px", background: "#fff" }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
