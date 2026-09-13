// src/pages/profile/admin/ExportData.jsx
import React, { useEffect, useState } from 'react';
import { eventService } from '../../../services/api';
import {
  generateEventsXml,
  generateEventsJson,
  downloadFile,
  EVENTS_DTD,
} from '../../../utils/exportUtils';
import DescriptionIcon from '@mui/icons-material/Description';
import DataObjectIcon from '@mui/icons-material/DataObject';
import CodeIcon from '@mui/icons-material/Code';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import './ExportData.css';

const ExportData = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [xmlPreview, setXmlPreview] = useState(false);
  const [jsonPreview, setJsonPreview] = useState(false);

  // ============================================
  // ΦΟΡΤΩΣΗ ΟΛΩΝ ΤΩΝ EVENTS
  // ============================================
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await eventService.getAllEvents();
      setEvents(response.data || []);
      setError('');
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Could not load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // EXPORT HANDLERS
  // ============================================
  const handleExportXml = () => {
    const xmlContent = generateEventsXml(events);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadFile(xmlContent, `eventize_events_${timestamp}.xml`, 'application/xml');
  };

  const handleExportJson = () => {
    const jsonContent = generateEventsJson(events);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadFile(jsonContent, `eventize_events_${timestamp}.json`, 'application/json');
  };

  const handleDownloadDtd = () => {
    downloadFile(EVENTS_DTD, 'events.dtd', 'application/xml-dtd');
  };

  // ============================================
  // LOADING / ERROR
  // ============================================
  if (loading) {
    return (
      <div className="export-loading">
        <div className="loading-spinner"></div>
        <p>Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="export-error">
        <p>{error}</p>
        <button className="btn-retry" onClick={fetchEvents}>Try Again</button>
      </div>
    );
  }

  // ============================================
  // ΠΡΟΕΤΟΙΜΑΣΙΑ PREVIEWS (μόνο όταν χρειάζεται, για performance)
  // ============================================
  const xmlContent = xmlPreview ? generateEventsXml(events) : '';
  const jsonContent = jsonPreview ? generateEventsJson(events) : '';

  return (
    <div className="export-container">
      {/* ============================================
          INFO BANNER
          ============================================ */}
      <div className="export-info-banner">
        <CodeIcon className="info-icon" />
        <div className="info-text">
          <h3>Export Events Data</h3>
          <p>
            Export all platform events in <strong>XML</strong> (compliant with the
            assignment DTD) or <strong>JSON</strong> format.
            Currently <strong>{events.length}</strong> event{events.length !== 1 ? 's' : ''} available.
          </p>
        </div>
      </div>

      {/* ============================================
          EXPORT CARDS
          ============================================ */}
      <div className="export-cards-grid">
        {/* ============== XML CARD ============== */}
        <div className="export-card">
          <div className="export-card-header">
            <DescriptionIcon className="export-card-icon xml-icon" />
            <div>
              <h3>XML Export</h3>
              <p className="export-card-subtitle">DTD-compliant format</p>
            </div>
          </div>

          <div className="export-card-body">
            <p className="export-card-description">
              Structured XML file following the assignment's DTD specification.
              Includes all events with their ticket types, bookings, and organizer info.
            </p>

            <div className="export-card-meta">
              <span className="meta-badge">📄 .xml</span>
              <span className="meta-badge">✓ DTD valid</span>
              <span className="meta-badge">🌐 UTF-8</span>
            </div>
          </div>

          <div className="export-card-actions">
            <button
              className="btn-preview"
              onClick={() => setXmlPreview(!xmlPreview)}
            >
              {xmlPreview ? <VisibilityOffIcon /> : <VisibilityIcon />}
              {xmlPreview ? 'Hide Preview' : 'Preview'}
            </button>
            <button
              className="btn-download primary"
              onClick={handleExportXml}
            >
              <DownloadIcon />
              Download XML
            </button>
          </div>
        </div>

        {/* ============== JSON CARD ============== */}
        <div className="export-card">
          <div className="export-card-header">
            <DataObjectIcon className="export-card-icon json-icon" />
            <div>
              <h3>JSON Export</h3>
              <p className="export-card-subtitle">Standard JSON format</p>
            </div>
          </div>

          <div className="export-card-body">
            <p className="export-card-description">
              JSON file with the same data structure as the XML export.
              Ideal for programmatic consumption and integration with other systems.
            </p>

            <div className="export-card-meta">
              <span className="meta-badge">📋 .json</span>
              <span className="meta-badge">✓ Valid JSON</span>
              <span className="meta-badge">🌐 UTF-8</span>
            </div>
          </div>

          <div className="export-card-actions">
            <button
              className="btn-preview"
              onClick={() => setJsonPreview(!jsonPreview)}
            >
              {jsonPreview ? <VisibilityOffIcon /> : <VisibilityIcon />}
              {jsonPreview ? 'Hide Preview' : 'Preview'}
            </button>
            <button
              className="btn-download primary"
              onClick={handleExportJson}
            >
              <DownloadIcon />
              Download JSON
            </button>
          </div>
        </div>

        {/* ============== DTD CARD ============== */}
        <div className="export-card">
          <div className="export-card-header">
            <CodeIcon className="export-card-icon dtd-icon" />
            <div>
              <h3>DTD File</h3>
              <p className="export-card-subtitle">Document Type Definition</p>
            </div>
          </div>

          <div className="export-card-body">
            <p className="export-card-description">
              The DTD file that defines the XML schema used in the XML export.
              Useful for validation tools and external consumers.
            </p>

            <div className="export-card-meta">
              <span className="meta-badge">📐 .dtd</span>
              <span className="meta-badge">✓ Standard</span>
            </div>
          </div>

          <div className="export-card-actions">
            <div />
            <button
              className="btn-download secondary"
              onClick={handleDownloadDtd}
            >
              <DownloadIcon />
              Download DTD
            </button>
          </div>
        </div>
      </div>

      {/* ============================================
          XML PREVIEW
          ============================================ */}
      {xmlPreview && (
        <div className="export-preview-section">
          <div className="preview-header">
            <h3>XML Preview</h3>
            <span className="preview-count">
              {events.length} events · {xmlContent.length.toLocaleString()} characters
            </span>
          </div>
          <pre className="preview-content xml-preview">
            {xmlContent.length > 8000
              ? xmlContent.slice(0, 8000) + '\n\n... [truncated for preview - download to see full file]'
              : xmlContent}
          </pre>
        </div>
      )}

      {/* ============================================
          JSON PREVIEW
          ============================================ */}
      {jsonPreview && (
        <div className="export-preview-section">
          <div className="preview-header">
            <h3>JSON Preview</h3>
            <span className="preview-count">
              {events.length} events · {jsonContent.length.toLocaleString()} characters
            </span>
          </div>
          <pre className="preview-content json-preview">
            {jsonContent.length > 8000
              ? jsonContent.slice(0, 8000) + '\n\n... [truncated for preview - download to see full file]'
              : jsonContent}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ExportData;