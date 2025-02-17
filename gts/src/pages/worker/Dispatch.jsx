import { useState, useEffect } from "react";
import axios from "axios";
import {
  Select,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  Checkbox,
  message,
} from "antd";
import { UploadOutlined, SearchOutlined } from "@ant-design/icons";
import "../../styles/Dispatch.css";

const Dispatch = () => {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [availableCylinders, setAvailableCylinders] = useState([]);
  const [selectedCylinders, setSelectedCylinders] = useState([]);
  const [step, setStep] = useState(1); // Track step in process

  // Fetch Companies
  useEffect(() => {
    axios
      .get("http://localhost:5000/companies", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((response) => setCompanies(response.data))
      .catch(() => message.error("Error fetching companies"));
  }, []);

  // Fetch Products
  useEffect(() => {
    axios
      .get("http://localhost:5000/products", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((response) => setProducts(response.data))
      .catch(() => message.error("Error fetching products"));
  }, []);

  // Fetch Available Cylinders when user clicks "Next"
  const fetchAvailableCylinders = async () => {
    if (!selectedProduct || !quantity) return;

    try {
      const response = await axios.get(
        `http://localhost:5000/available-cylinders?product=${selectedProduct}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      setAvailableCylinders(response.data);
      setStep(2); // Move to cylinder selection step
    } catch (error) {
      message.error("Error fetching available cylinders");
    }
  };

  // Handle Cylinder Selection
  const toggleCylinderSelection = (serialNumber) => {
    setSelectedCylinders((prevSelected) =>
      prevSelected.includes(serialNumber)
        ? prevSelected.filter((sn) => sn !== serialNumber)
        : [...prevSelected, serialNumber]
    );
  };

  // Handle Confirm Dispatch
  const handleConfirmDispatch = async () => {
    if (selectedCylinders.length !== Number(quantity)) {
      message.warning(`Please select exactly ${quantity} cylinders`);
      return;
    }

    const payload = {
      serialNumbers: selectedCylinders,
      companyId,
      selectedProduct,
      quantity,
    };

    console.log("Dispatch Payload:", payload); // Debugging

    try {
      const response = await axios.post(
        "http://localhost:5000/dispatch-cylinder",
        payload,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      message.success("Cylinders Dispatched Successfully!");
      setStep(1);
      setSelectedCylinders([]);
      setAvailableCylinders([]);
      setCompanyId("");
      setSelectedProduct("");
      setQuantity("");
    } catch (error) {
      console.error("Dispatch Error:", error.response?.data || error);
      message.error(
        `Error dispatching cylinders: ${
          error.response?.data?.error || "Unknown error"
        }`
      );
    }
  };

  return (
    <Card className="dispatch-card">
      <h2 className="dispatch-title">
        <UploadOutlined /> Dispatch Cylinders
      </h2>

      {/* Form Always Visible */}
      <div className="dispatch-form">
        <label className="dispatch-label">Select Company:</label>
        <Select
          className="dispatch-select"
          placeholder="Start typing company name..."
          showSearch
          optionFilterProp="children"
          onChange={setCompanyId}
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

        <label className="dispatch-label">Select Cylinder Type:</label>
        <Select
          className="dispatch-select"
          placeholder="Start typing cylinder type..."
          showSearch
          optionFilterProp="children"
          onChange={setSelectedProduct}
          value={selectedProduct}
          filterOption={(input, option) =>
            option.children.toLowerCase().includes(input.toLowerCase())
          }
        >
          {products.map((product, index) => (
            <Select.Option key={index} value={product}>
              {product}
            </Select.Option>
          ))}
        </Select>

        <label className="dispatch-label">Enter Quantity:</label>
        <InputNumber
          className="dispatch-quantity"
          min={1}
          value={quantity}
          placeholder="Enter quantity"
          onChange={setQuantity}
        />

        <Button
          type="primary"
          icon={<SearchOutlined />}
          className="next-button"
          onClick={fetchAvailableCylinders}
        >
          Next
        </Button>
      </div>

      {/* Step 2: Select Cylinders */}
      {step === 2 && (
        <>
          <h3>Select {quantity} Cylinders:</h3>
          <Row gutter={[16, 16]}>
            {availableCylinders.map((cylinder) => (
              <Col key={cylinder.serial_number} xs={12} sm={8} md={6}>
                <Checkbox
                  className="cylinder-checkbox"
                  checked={selectedCylinders.includes(cylinder.serial_number)}
                  onChange={() =>
                    toggleCylinderSelection(cylinder.serial_number)
                  }
                  disabled={
                    !selectedCylinders.includes(cylinder.serial_number) &&
                    selectedCylinders.length >= quantity
                  }
                >
                  {cylinder.serial_number} - {cylinder.gas_type} (
                  {cylinder.size})
                </Checkbox>
              </Col>
            ))}
          </Row>

          <Button
            type="primary"
            className="dispatch-button"
            icon={<UploadOutlined />}
            onClick={handleConfirmDispatch}
          >
            Confirm Dispatch
          </Button>
        </>
      )}
    </Card>
  );
};

export default Dispatch;
