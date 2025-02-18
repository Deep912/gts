import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Select,
  Modal,
  Form,
  Input,
  message,
  Switch,
} from "antd";
import axios from "axios";
import { PlusOutlined, DeleteOutlined, UndoOutlined } from "@ant-design/icons";

const { Option } = Select;

const Cylinders = () => {
  const [cylinders, setCylinders] = useState([]);
  const [deletedCylinders, setDeletedCylinders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(""); // Filter by status
  const [showDeleted, setShowDeleted] = useState(false); // Toggle deleted cylinders
  const [cylinderId, setCylinderId] = useState(""); // Auto-generated ID
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 🔹 Fetch Cylinders
  useEffect(() => {
    loadCylinders();
    loadDeletedCylinders();
  }, []);

  const loadCylinders = () => {
    setLoading(true);
    axios
      .get("http://localhost:5000/admin/cylinders", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((response) => setCylinders(response.data))
      .catch(() => message.error("Error fetching cylinders"))
      .finally(() => setLoading(false));
  };

  // 🔹 Fetch Deleted Cylinders
  const loadDeletedCylinders = () => {
    setLoading(true);
    axios
      .get("http://localhost:5000/admin/deleted-cylinders", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((response) => setDeletedCylinders(response.data))
      .catch(() => message.error("Error fetching deleted cylinders"))
      .finally(() => setLoading(false));
  };

  // 🔹 Generate Cylinder ID
  const generateCylinderId = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/admin/generate-cylinder-id",
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setCylinderId(response.data.new_id);
      form.setFieldsValue({ serial_number: response.data.new_id }); // Set value in form
    } catch (error) {
      message.error("Error generating cylinder ID");
    }
  };

  // 🔹 Add Cylinder
  const handleAddCylinder = (values) => {
    axios
      .post("http://localhost:5000/admin/add-cylinder", values, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(() => {
        message.success("Cylinder added successfully!");
        setIsModalVisible(false);
        form.resetFields();
        loadCylinders();
      })
      .catch(() => message.error("Failed to add cylinder."));
  };

  return (
    <Card
      title="Cylinders Management"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalVisible(true)}
        >
          Add Cylinder
        </Button>
      }
    >
      {/* Cylinders Table */}
      <Table
        dataSource={showDeleted ? deletedCylinders : cylinders}
        loading={loading}
        rowKey="serial_number"
        columns={[
          {
            title: "Serial Number",
            dataIndex: "serial_number",
            key: "serial_number",
          },
          {
            title: "Gas Type",
            dataIndex: "gas_type",
            key: "gas_type",
          },
          {
            title: "Size (L)",
            dataIndex: "size",
            key: "size",
          },
          {
            title: "Status",
            dataIndex: "status",
            key: "status",
          },
        ]}
      />

      {/* Add Cylinder Modal */}
      <Modal
        title="Add New Cylinder"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleAddCylinder}>
          {/* Cylinder ID */}
          <Form.Item
            label="Cylinder ID"
            name="serial_number"
            rules={[
              { required: true, message: "Enter or generate Cylinder ID" },
            ]}
          >
            <Input
              placeholder="Enter manually or click 'Generate ID'"
              value={cylinderId}
              onChange={(e) => setCylinderId(e.target.value)}
              addonAfter={
                <Button type="primary" onClick={generateCylinderId}>
                  Generate ID
                </Button>
              }
            />
          </Form.Item>

          {/* Gas Type */}
          <Form.Item
            label="Gas Type"
            name="gas_type"
            rules={[{ required: true, message: "Select gas type" }]}
          >
            <Select placeholder="Select gas type">
              <Option value="Oxygen">Oxygen</Option>
              <Option value="Nitrogen">Nitrogen</Option>
              <Option value="Chlorine">Chlorine</Option>
            </Select>
          </Form.Item>

          {/* Size */}
          <Form.Item
            label="Size (L)"
            name="size"
            rules={[{ required: true, message: "Select a valid size" }]}
          >
            <Select placeholder="Select size">
              {[10, 20, 30, 50, 100].map((size) => (
                <Option key={size} value={size}>
                  {size}L
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Status */}
          <Form.Item
            label="Status"
            name="status"
            initialValue="available"
            rules={[{ required: true, message: "Select status" }]}
          >
            <Select>
              <Option value="available">Available</Option>
              <Option value="dispatched">Dispatched</Option>
              <Option value="empty">Empty</Option>
              <Option value="refilling">Refilling</Option>
            </Select>
          </Form.Item>

          {/* Submit Button */}
          <Button type="primary" htmlType="submit">
            Add Cylinder
          </Button>
        </Form>
      </Modal>
    </Card>
  );
};

export default Cylinders;
