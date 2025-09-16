# QR Code Generator

A Next.js application that generates QR codes from multiple links and formats them for printing with 9 QR codes per page.

## Features

- **Batch QR Code Generation**: Input multiple links (one per line) and generate QR codes for all of them
- **Numbered QR Codes**: Each QR code is automatically numbered for easy identification
- **Print-Optimized Layout**: Automatically formats QR codes for printing with 9 codes per page
- **URL Validation**: Automatically validates and normalizes URLs (adds https:// if missing)
- **Responsive Design**: Works on desktop and mobile devices
- **Print Preview**: See how your QR codes will look before printing

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd qr-code-generator
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

1. **Enter Links**: In the text area, enter your links one per line. You can enter URLs with or without the `https://` prefix.

   Example:
   ```
   https://google.com
   github.com
   stackoverflow.com
   https://www.example.com
   ```

2. **Generate QR Codes**: Click the "Generate QR Codes" button to create QR codes for all your links.

3. **Preview**: Review the generated QR codes in the preview section. Each QR code will be numbered and show the URL below it.

4. **Print**: Click the "Print QR Codes" button to open the print dialog. The application will automatically format the QR codes in a 3x3 grid (9 per page).

## Print Layout

- **9 QR codes per page** arranged in a 3x3 grid
- **A4 paper size** with appropriate margins
- **Each QR code includes**:
  - Sequential number (#1, #2, #3, etc.)
  - The QR code itself (120x120px)
  - The full URL below the code
- **Page breaks** automatically added when you have more than 9 QR codes

## URL Handling

The application automatically:
- Validates URLs for correctness
- Adds `https://` prefix to URLs that don't have a protocol
- Shows error indicators for invalid URLs
- Breaks long URLs appropriately in the print layout

## Technologies Used

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **react-qr-code** - QR code generation
- **Print CSS** - Custom print layouts

## Building for Production

```bash
npm run build
npm start
```

## Development

```bash
npm run dev
```

## License

MIT License - feel free to use this project for personal or commercial purposes.