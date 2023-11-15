import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Transfer.css';

const Transfer = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [batchData, setBatchData] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [fromWarehouse, setFromWarehouse] = useState('');
    const [fromBin, setFromBin] = useState('');
    const [toWarehouse, setToWarehouse] = useState('');
    const [toBin, setToBin] = useState('');
    const [quantity, setQuantity] = useState('');
    const [availableQuantity, setAvailableQuantity] = useState(0);
    const [postingDate, setPostingDate] = useState(new Date().toISOString().split('T')[0]);
    const [remark, setRemark] = useState('');
    const [fromWarehouseList, setFromWarehouseList] = useState([]);
    const [fromBinList, setFromBinList] = useState([]);
    const [toWarehouseList, setToWarehouseList] = useState([]);
    const [toBinList, setToBinList] = useState([]);
    const [filteredFromBinList, setFilteredFromBinList] = useState([]);
    const [filteredToBinList, setFilteredToBinList] = useState([]);
    const [transferSummary, setTransferSummary] = useState(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [validationMessages, setValidationMessages] = useState({});

    useEffect(() => {
        fetchToBinLocations();
    }, []);

    const fetchToBinLocations = async () => {
        try {
            const response = await axios.post('http://localhost:3005/api/binlocations');
            if (response.data.value) {
                const warehouses = [...new Set(response.data.value.map(item => item.Warehouse))];
                const bins = response.data.value;
                setToWarehouseList(warehouses);
                setToBinList(bins);
            }
        } catch (error) {
            console.error('Error fetching to bin locations:', error);
        }
    };

    useEffect(() => {
        const filteredBins = toBinList.filter(bin => bin.Warehouse === toWarehouse);
        setFilteredToBinList(filteredBins.map(bin => bin.BinCode));
    }, [toWarehouse, toBinList]);

    useEffect(() => {
        const filteredBins = fromBinList.filter(bin => bin.startsWith(fromWarehouse));
        setFilteredFromBinList(filteredBins);
        if (!filteredBins.includes(fromBin)) {
            setFromBin('');
        }
    }, [fromWarehouse, fromBinList]);

    const handleSearch = async () => {
        setErrorMessage('');
        try {
            const response = await axios.post('http://localhost:3005/api/batchinbin', { searchTerm });
            if (response.data.value && response.data.value.length > 0) {
                setBatchData(response.data.value);
                const warehouses = [...new Set(response.data.value.map(item => item.WhsCode))];
                const bins = [...new Set(response.data.value.map(item => item.BinCode))];
                setFromWarehouseList(warehouses);
                setFromBinList(bins);
                updateAvailableQuantity('', warehouses[0]);
            } else {
                setBatchData([]);
                setErrorMessage('No data found for the provided search term.');
                setFromWarehouseList([]);
                setFromBinList([]);
                setAvailableQuantity(0);
            }
        } catch (error) {
            console.error('Error fetching batch data:', error);
            setBatchData([]);
            setErrorMessage('An error occurred while fetching data.');
            setFromWarehouseList([]);
            setFromBinList([]);
            setAvailableQuantity(0);
        }
    };

    const updateAvailableQuantity = (binCode, warehouseCode) => {
        if (binCode) {
            const binData = batchData.find(item => item.BinCode === binCode);
            setAvailableQuantity(binData ? binData.OnHandQty : 0);
        } else {
            const totalQty = batchData
                .filter(item => item.WhsCode === warehouseCode)
                .reduce((sum, item) => sum + item.OnHandQty, 0);
            setAvailableQuantity(totalQty);
        }
    };

    useEffect(() => {
        updateAvailableQuantity(fromBin, fromWarehouse);
    }, [fromBin, fromWarehouse, batchData]);

    const validateFields = () => {
        let messages = {};
        if (!fromWarehouse) messages.fromWarehouse = 'From Warehouse is required.';
        if (!fromBin) messages.fromBin = 'From Bin is required.';
        if (!toWarehouse) messages.toWarehouse = 'To Warehouse is required.';
        if (!toBin) messages.toBin = 'To Bin is required.';
        if (quantity <= 0) messages.quantity = 'Quantity must be greater than zero.';
        if (quantity > availableQuantity) messages.quantity = `Quantity cannot exceed available stock (${availableQuantity}).`;
        if (new Date(postingDate) > new Date()) messages.postingDate = 'Posting date cannot be in the future.';
        if (!remark.trim()) messages.remark = 'Remark is required.';

        setValidationMessages(messages);
        return Object.keys(messages).length === 0;
    };

    const handleTransferClick = () => {
        if (validateFields()) {
            const summary = {
                fromWarehouse,
                fromBin,
                toWarehouse,
                toBin,
                quantity,
                postingDate,
                remark
            };
            setTransferSummary(summary);
            setShowConfirmation(true);
        }
    };

    const handleConfirmTransfer = () => {
        setErrorMessage('');
        console.log("Confirmed Transfer:", transferSummary);
        resetFields();
    };

    const handleAbortTransfer = () => {
        setShowConfirmation(false);
    };

    const handleClearAll = () => {
        resetFields();
    };

    const resetFields = () => {
        setSearchTerm('');
        setFromWarehouse('');
        setFromBin('');
        setToWarehouse('');
        setToBin('');
        setQuantity('');
        setPostingDate(new Date().toISOString().split('T')[0]);
        setRemark('');
        setErrorMessage('');
        setTransferSummary(null);
        setShowConfirmation(false);
        setValidationMessages({});
    };

    const handleQuantityChange = (e) => {
        const newQuantity = e.target.value;

        if (newQuantity < 0) {
            setErrorMessage('Quantity cannot be negative.');
        } else if (newQuantity > availableQuantity) {
            setErrorMessage(`Quantity cannot exceed available stock (${availableQuantity}).`);
        } else {
            setErrorMessage('');
        }

        setQuantity(newQuantity);
    };

    const handlePostingDateChange = (e) => {
        const newDate = e.target.value;
        const today = new Date().toISOString().split('T')[0];

        if (newDate > today) {
            setErrorMessage('Posting date cannot be in the future.');
        } else {
            setErrorMessage('');
        }

        setPostingDate(newDate);
    };

    return (
        <div className="container">
          {errorMessage && <p className="error">{errorMessage}</p>}
          <div className="searchSection">
            <label className="label">
              Batch Search
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input"
              />
            </label>
            <button onClick={handleSearch} className="button">
              Search
            </button>
          </div>
          <div className="results">
            {renderField('Item Code', batchData[0]?.ItemCode)}
            {renderField('Item Name', batchData[0]?.ItemName)}
            {renderField('Batch Number', batchData[0]?.DistNumber)}
    
            {renderDropdown('From Warehouse', fromWarehouse, setFromWarehouse, ['', ...fromWarehouseList])}
            {renderDropdown('From Bin Code', fromBin, setFromBin, ['', ...filteredFromBinList])}
    
            {renderDropdown('To Warehouse', toWarehouse, setToWarehouse, ['', ...toWarehouseList])}
            {renderDropdown('To Bin Code', toBin, setToBin, ['', ...filteredToBinList])}
    
            <div className="fieldRow">
              <span className="fieldLabel">Quantity (Available: {availableQuantity}):</span>
              <input
                type="number"
                value={quantity}
                onChange={handleQuantityChange}
                className="input"
              />
            </div>
            <div className="fieldRow">
              <span className="fieldLabel">Posting Date:</span>
              <input
                type="date"
                value={postingDate}
                onChange={handlePostingDateChange}
                className="input"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="fieldRow">
              <span className="fieldLabel">Remark:</span>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="input"
                style={{ height: '100px' }}
              />
            </div>
            <div className="actionButtons">
              <button onClick={handleTransferClick} className="button">Transfer</button>
              <button onClick={handleClearAll} className="button">Clear All</button>
            </div>
            {showConfirmation && (
              <div className="confirmation">
                <p>Are you sure you want to proceed with the following transfer?</p>
                <ul>
                  {Object.entries(transferSummary).map(([key, value]) => (
                    <li key={key}>{`${key}: ${value}`}</li>
                  ))}
                </ul>
                <button onClick={handleConfirmTransfer} className="button">Confirm</button>
                <button onClick={handleAbortTransfer} className="button">Abort</button>
              </div>
            )}
          </div>
        </div>
      );
    };

const renderField = (label, value) => (
    <div className="fieldRow">
        <span className="fieldLabel">{label}:</span>
        <span className="fieldValue">{value !== undefined ? value : ''}</span>
    </div>
);

const renderDropdown = (label, value, setValue, options) => (
    <div className="fieldRow">
        <span className="fieldLabel">{label}:</span>
        <select className="dropdown" value={value} onChange={(e) => setValue(e.target.value)}>
            {options.map((option, index) => <option key={index} value={option}>{option}</option>)}
        </select>
    </div>
);

export default Transfer;