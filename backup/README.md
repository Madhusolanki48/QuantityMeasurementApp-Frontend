# Quantity Measurement App Frontend

A standalone Angular frontend for a quantity measurement application. It includes a login and signup experience, a measurement dashboard, and in-browser calculation history so you can run and demonstrate the app without connecting a backend yet.

## Overview

Users can create an account, sign in, and work with length, volume, weight, and temperature conversions. The dashboard also keeps a local history of recent calculations for quick review.

## Features

- email and password based login and signup
- dashboard with quick access to measurement categories
- convert, add, subtract, multiply, and divide operations in the browser
- local history for calculations
- responsive layout for desktop and mobile
- light and dark theme support

## Tech Stack

- Angular 21
- TypeScript
- RxJS
- Bootstrap Icons

## Prerequisites

- Node.js and npm
- Angular CLI

## Setup

```bash
npm install
npm start
```

Open the app at:

```bash
http://localhost:4200/
```

## Build

```bash
npm run build
```

## Project Structure

```text
src/
  app/
    core/           shared services
    pages/          login and dashboard pages
    shared/         calculator component
    models.ts       shared types
  assets/           static files
  styles.css        global styles
```

## Screenshots

Add your screenshots in a folder named `screenshots/` and reference them here.

### Login Page

![Login page](screenshots/login-page.png)

### Dashboard

![Dashboard](screenshots/dashboard.png)

### Measurement Calculator

![Calculator](screenshots/calculator.png)

### History

![History](screenshots/history.png)

## Notes

- user accounts are stored locally for now
- calculations are handled in the frontend
- history is saved in the browser so you can test the full ui without a backend

## License

Add a license here if you plan to publish the project publicly.
