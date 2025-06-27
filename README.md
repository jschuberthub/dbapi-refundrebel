# Refundrebel Train Tracker

A modern, responsive web application for searching Deutsche Bahn train stations and viewing real-time departures and arrivals. Built for the Refundrebel Dev Challenge.

## 🚀 Features

- **Station Search**: Real-time search with autocomplete suggestions
- **Train Information**: Display departures and arrivals with detailed information
- **Smart Filtering**: Filter by train types (ICE, EC, IR, RE, RB), delay status, and platforms
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Data**: Powered by Deutsche Bahn's official API
- **Modern UI**: Clean, intuitive interface with smooth animations

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **API**: Deutsche Bahn API via `db-vendo-client`
- **Documentation**: Swagger/OpenAPI

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd dbapi-refundrebel
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Application

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **API Documentation**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/api/health

## 📚 API Endpoints

### Station Search
```
GET /api/stations?query={stationName}&limit={number}
```

**Parameters:**
- `query` (required): Station name to search for
- `limit` (optional): Maximum number of results (1-50, default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "8002549",
      "name": "Hamburg Hbf",
      "city": "Hamburg",
      "latitude": 53.6304,
      "longitude": 10.0074,
      "products": ["ICE", "IC", "EC", "RE", "RB"]
    }
  ],
  "count": 1,
  "query": "Hamburg"
}
```

### Departures and Arrivals
```
GET /api/station/{stationId}/departures?minutes={duration}
```

**Parameters:**
- `stationId` (required): Station ID from search results
- `minutes` (optional): Time window in minutes (1-1440, default: 60)

**Response:**
```json
{
  "success": true,
  "stationId": "8002549",
  "duration": 60,
  "departures": [
    {
      "tripId": "20250627-5f94444a-cf17-34e8-a017-890d10912842",
      "direction": "Berlin Hbf",
      "line": {
        "name": "ICE 1074",
        "product": "ICE"
      },
      "when": "2025-06-27T15:37:43+02:00",
      "plannedWhen": "2025-06-27T15:52:00+02:00",
      "delay": 5,
      "platform": "8",
      "plannedPlatform": "8"
    }
  ],
  "arrivals": [...],
  "departuresCount": 15,
  "arrivalsCount": 12,
  "timestamp": "2025-06-27T13:37:43.000Z"
}
```

## 🎨 Frontend Features

### Search and Filtering
- **Real-time station search** with keyboard navigation
- **Time window selection** (1-5 hours)
- **Train type filters** (ICE, EC, IR, RE, RB)
- **Delay status filters** (On time, Delayed, Early)
- **Platform filtering** (Show only trains with platform info)
- **Direction filtering** (Filter by destination)

### User Experience
- **Responsive design** for all screen sizes
- **Smooth animations** and transitions
- **Loading states** and error handling
- **Accessibility features** (ARIA labels, keyboard navigation)
- **Auto-scroll** to results when applying filters

## 🏗️ Project Structure

```
dbapi-refundrebel/
├── src/                    # Backend source code
│   ├── index.js           # Main server file
│   ├── routes/            # API route handlers
│   │   ├── stations.js    # Station search endpoints
│   │   └── departures.js  # Departure/arrival endpoints
│   └── services/          # Business logic
│       └── db.js          # Deutsche Bahn API integration
├── client/                # Frontend files
│   ├── index.html         # Main HTML file
│   ├── app.js            # Frontend JavaScript
│   └── styles.css        # Styling
├── package.json           # Dependencies and scripts
├── README.md             # This file
└── swagger.yaml          # API documentation
```

## 🔧 Configuration

### Environment Variables

The application uses the following environment variables:

- `PORT` (optional): Server port (default: 3000)
- `NODE_ENV` (optional): Environment mode (development/production)

### Production Deployment

1. **Set environment variables:**
   ```bash
   export NODE_ENV=production
   export PORT=3000
   ```

2. **Install production dependencies:**
   ```bash
   npm install --production
   ```

3. **Start the application:**
   ```bash
   npm start
   ```

## 🧪 Development

### Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with auto-reload
- `npm test` - Run tests (not implemented)
- `npm run lint` - Run linter (not implemented)

### Code Style

- Use ES6+ JavaScript features
- Follow consistent naming conventions
- Include JSDoc comments for functions
- Handle errors gracefully

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

This project was created for the Refundrebel Dev Challenge. For questions or issues, please refer to the challenge documentation.

## 🙏 Acknowledgments

- Deutsche Bahn for providing the train data API
- `db-vendo-client` for the excellent API wrapper
- Refundrebel for the development challenge opportunity
