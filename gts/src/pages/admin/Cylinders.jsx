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
import {
  PlusOutlined,
  DeleteOutlined,
  EyeInvisibleOutlined,
  SyncOutlined,
} from "@ant-design/icons";

const { Option } = Select;

const Cylinders = () => {
  const [cylinders, setCylinders] = useState([]);
  const [deletedCylinders, setDeletedCylinders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  // 🔹 Modal States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [cylinderId, setCylinderId] = useState("");

  // 🔹 Fetch Active and Deleted Cylinders
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

  // 🔹 Delete Cylinder (Move to Deleted)
  const handleDelete = (serial_number) => {
    axios
      .post(
        "http://localhost:5000/admin/delete-cylinder",
        { serial_number },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      )
      .then(() => {
        message.success("Cylinder moved to deleted records.");
        loadCylinders();
        loadDeletedCylinders();
      })
      .catch(() => message.error("Failed to delete cylinder."));
  };

  // 🔹 Restore Deleted Cylinder
  const handleRestore = (serial_number) => {
    axios
      .post(
        "http://localhost:5000/admin/restore-cylinder",
        { serial_number },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      )
      .then(() => {
        message.success("Cylinder restored successfully.");
        loadCylinders();
        loadDeletedCylinders();
      })
      .catch(() => message.error("Failed to restore cylinder."));
  };

  // 🔹 Change Cylinder Status
  const handleChangeStatus = (serial_number, status) => {
    axios
      .post(
        "http://localhost:5000/admin/update-cylinder-status",
        { serial_number, status },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      )
      .then(() => {
        message.success("Cylinder status updated.");
        loadCylinders();
      })
      .catch(() => message.error("Failed to update status."));
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
      {/* Filter & Toggle Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        {!showDeleted && (
          <Select
            placeholder="Filter by status"
            onChange={(value) => setStatusFilter(value)}
            allowClear
            style={{ width: 200 }}
          >
            <Option value="">All</Option>
            <Option value="available">Available</Option>
            <Option value="dispatched">Dispatched</Option>
            <Option value="empty">Empty</Option>
            <Option value="refilling">Refilling</Option>
          </Select>
        )}

        <Switch
          checked={showDeleted}
          onChange={(checked) => setShowDeleted(checked)}
          checkedChildren="Show Deleted"
          unCheckedChildren="Show Active"
          style={{ marginLeft: "auto" }}
        />
      </div>

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
          ...(showDeleted
            ? [
                {
                  title: "Deleted By",
                  dataIndex: "deleted_by",
                  key: "deleted_by",
                },
                {
                  title: "Deleted On",
                  dataIndex: "deleted_at",
                  key: "deleted_at",
                },
                {
                  title: "Actions",
                  key: "actions",
                  render: (_, record) => (
                    <Button
                      icon={<SyncOutlined />}
                      type="primary"
                      onClick={() => handleRestore(record.serial_number)}
                    >
                      Restore
                    </Button>
                  ),
                },
              ]
            : [
                {
                  title: "Status",
                  dataIndex: "status",
                  key: "status",
                  render: (text, record) => (
                    <Select
                      value={text}
                      onChange={(value) =>
                        handleChangeStatus(record.serial_number, value)
                      }
                      style={{ width: 120 }}
                    >
                      <Option value="available">Available</Option>
                      <Option value="dispatched">Dispatched</Option>
                      <Option value="empty">Empty</Option>
                      <Option value="refilling">Refilling</Option>
                    </Select>
                  ),
                },
                {
                  title: "Actions",
                  key: "actions",
                  render: (_, record) => (
                    <Button
                      type="primary"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(record.serial_number)}
                    />
                  ),
                },
              ]),
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
          <Form.Item
            label="Cylinder ID"
            name="serial_number"
            rules={[
              { required: true, message: "Enter or generate a cylinder ID" },
            ]}
          >
            <Input
              value={cylinderId}
              onChange={(e) => setCylinderId(e.target.value)}
              addonAfter={
                <Button type="primary" onClick={generateCylinderId}>
                  Generate ID
                </Button>
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Cylinders;
