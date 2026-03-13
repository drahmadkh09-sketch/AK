# Relay - Social Media Infrastructure Dashboard

High-fidelity dashboard for social media command and control.

## Setup

1.  **Environment Variables**:
    Copy `.env.example` to `.env` and fill in the values.
    ```bash
    cp .env.example .env
    ```
    - `SHARED_AUTH_TOKEN`: Shared secret for API authentication.
    - `GEMINI_API_KEY`: Required for the AI-driven data ingestion engine.
    - `META_ACCESS_TOKEN`: Required for real Meta (Instagram/Facebook) data pulls.
    - `YOUTUBE_API_KEY`: Required for real YouTube data pulls.

2.  **Dependencies**:
    ```bash
    npm install
    ```

3.  **Development Server**:
    ```bash
    npm run dev
    ```

4.  **Data Ingestion (Local Cron)**:
    To pull fresh metrics and generate alerts manually or via a local cron job:
    ```bash
    npm run ingest
    ```
    *Note: The server also runs this process automatically every hour while active.*

## Features

- **Ecosystem Intelligence**: Real-time monitoring of social media nodes.
- **Anomalies Engine**: Automated detection of cadence gaps and metric drops.
- **Audit Pipeline**: High-fidelity quality control for content output.
- **Strategic Insights**: AI-generated engagement strategies.
- **Account Registry**: Complete management of digital infrastructure with CSV import/export.
