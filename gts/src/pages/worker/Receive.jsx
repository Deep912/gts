import { useState, useEffect } from "react";
import axios from "axios";
import { Select, Input, Button, Card, Row, Col, Switch, message } from "antd";
import { DownloadOutlined, SearchOutlined } from "@ant-design/icons";
import "../../styles/Receive.css";

const Receive = () => {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [dispatchedCylinders, setDispatchedCylinders] = useState([]);
  const [selectedCylinders, setSelectedCylinders] = useState([]);
  const [notEmptyCylinders, setNotEmptyCylinders] = useState([]);
  const [searchCylinder, setSearchCylinder] = useState("");

  // ✅ Fetch Companies
  useEffect(() => {
    axios
      .get("http://localhost:5000/companies", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((response) => setCompanies(response.data))
      .catch(() => message.error("Error fetching companies"));
  }, []);

  // ✅ Fetch Dispatched Cylinders Immediately on Company Selection
  useEffect(() => {
    if (!companyId) return;
    axios
      .get(
        `http://localhost:5000/dispatched-cylinders?companyId=${companyId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      )
      .then((response) => {
        setDispatchedCylinders(response.data);
        setSelectedCylinders([]);
        setNotEmptyCylinders([]);
      })
      .catch(() => message.error("Error fetching dispatched cylinders"));
  }, [companyId]);

  // ✅ Select Cylinder (From List)
  const handleCylinderSelection = (serialNumber) => {
    setSelectedCylinders((prev) =>
      prev.includes(serialNumber)
        ? prev.filter((sn) => sn !== serialNumber) // Deselect if already selected
        : [...prev, serialNumber]
    );
  };

  // ✅ Toggle "Not Empty" Status (UX Improved)
  const toggleNotEmpty = (serialNumber, checked) => {
    setNotEmptyCylinders(
      (prev) =>
        checked
          ? [...prev, serialNumber] // Add to "Not Empty" list
          : prev.filter((sn) => sn !== serialNumber) // Remove if unchecked
    );
  };

  // ✅ Handle Manual Entry (Search & Select)
  const handleManualEntry = () => {
    if (!searchCylinder.trim()) return;
    const exists = dispatchedCylinders.some(
      (cylinder) => cylinder.serial_number === searchCylinder
    );
    if (exists) {
      handleCylinderSelection(searchCylinder);
      setSearchCylinder("");
    } else {
      message.warning("Cylinder not found in dispatched list");
    }
  };

  // ✅ Confirm Receive
  const handleConfirmReceive = () => {
    if (selectedCylinders.length === 0) {
      message.warning("Please select at least one cylinder");
      return;
    }

    axios
      .post(
        "http://localhost:5000/receive-cylinder",
        {
          emptySerialNumbers: selectedCylinders.filter(
            (sn) => !notEmptyCylinders.includes(sn)
          ),
          filledSerialNumbers: notEmptyCylinders,
          companyId,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      )
      .then(() => {
        message.success("Cylinders received successfully!");
        setSelectedCylinders([]);
        setNotEmptyCylinders([]);
        setDispatchedCylinders([]); // Reset the list after confirmation
      })
      .catch(() => message.error("Error receiving cylinders"));
  };

  return (
    <Card className="receive-card">
      <h2 className="receive-title">
        <DownloadOutlined /> Receive Cylinders
      </h2>

      {/* ✅ Select Company (Fixed Width) */}
      <label className="receive-label">Select Company:</label>
      <Select
        className="receive-select"
        placeholder="Search & Select Company..."
        showSearch
        optionFilterProp="children"
        onChange={(value) => setCompanyId(value)}
        value={companyId}
        filterOption={(input, option) =>
          option.children.toLowerCase().includes(input.toLowerCase())
        }
      >
        {companies.map((company) => (
          <Select.Option key={company.id} value={company.id}>
            {company.name}
          </Select.Option>
        ))}
      </Select>

      {/* ✅ Search and Manually Enter Cylinder ID */}
      <label className="receive-label">Enter Cylinder ID (Optional):</label>
      <Input.Search
        className="receive-search"
        placeholder="Type cylinder ID..."
        value={searchCylinder}
        onChange={(e) => setSearchCylinder(e.target.value)}
        onSearch={handleManualEntry}
        enterButton={<SearchOutlined />}
      />

      {/* ✅ List of Dispatched Cylinders */}
      {dispatchedCylinders.length > 0 && (
        <div className="receive-cylinders">
          <h3>Select Returned Cylinders:</h3>
          <Row gutter={[16, 16]}>
            {dispatchedCylinders.map((cylinder) => (
              <Col key={cylinder.serial_number} xs={12} sm={8} md={6}>
                <Card
                  className={`cylinder-card ${
                    selectedCylinders.includes(cylinder.serial_number)
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    handleCylinderSelection(cylinder.serial_number)
                  }
                >
                  <div className="cylinder-info">
                    <span>{cylinder.serial_number}</span> -{" "}
                    <span>
                      {cylinder.gas_type} ({cylinder.size})
                    </span>
                  </div>
                </Card>

                {/* ✅ Toggle "Not Empty" (Outside Main Card Now) */}
                {selectedCylinders.includes(cylinder.serial_number) && (
                  <div className="not-empty-toggle">
                    <span>Not Empty</span>
                    <Switch
                      checked={notEmptyCylinders.includes(
                        cylinder.serial_number
                      )}
                      onChange={(checked) =>
                        toggleNotEmpty(cylinder.serial_number, checked)
                      }
                    />
                  </div>
                )}
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* ✅ Confirm Button */}
      <Button
        type="primary"
        className="receive-button"
        icon={<DownloadOutlined />}
        disabled={selectedCylinders.length === 0}
        onClick={handleConfirmReceive}
      >
        Confirm Receive
      </Button>
    </Card>
  );
};

export default Receive;
