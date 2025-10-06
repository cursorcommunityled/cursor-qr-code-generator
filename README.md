# Cursor Credits QR Code Generator

## Why This Exists

I needed to print QR codes for Cursor referral links to hand out at an event. Doing this manually would have been a hassle - generating each QR code individually, formatting them for printing, making sure they're properly sized and numbered.

Couldn't find a simple tool that did exactly what I needed, so I built this. It's a basic app, but it works well and maybe someone else will find it useful.

Upload a CSV file with your links (or paste them manually) and get a clean, printable PDF with 9 QR codes per page.

## What It Does

- Takes your Cursor referral links (or any links really)
- Generates QR codes for all of them
- Formats them in a nice 3×3 grid for printing
- Numbers everything so you can track which codes you've handed out
- Works with CSV upload or manual entry

## Cut-and-Stack Numbering

This app uses a special numbering system designed for easy physical organization after printing.

**How it works:**
- Instead of numbering 1-9 on page 1, 10-18 on page 2, etc.
- The same grid position across all pages gets consecutive numbers
- Page 1: 1, 12, 23, 34, 45, 56, 67, 78, 89
- Page 2: 2, 13, 24, 35, 46, 57, 68, 79, 90
- Page 3: 3, 14, 25, 36, 47, 58, 69, 80, 91

**After printing:**
1. Cut each page into 9 squares along the grid lines
2. Stack all squares from the same position together (all top-left squares, all top-middle squares, etc.)
3. Arrange the 9 stacks in the same 3×3 pattern as printed
4. Stack them left-to-right, top-to-bottom into one pile
5. Your QR codes are now in perfect order 1, 2, 3... with no sorting needed!


## How to Use

1. Choose to upload a CSV file or enter links manually
2. For CSV: Upload a file with one URL per row
3. For manual: Enter URLs one per line in the text box
4. Click generate to create QR codes
5. Print the results - they'll be formatted 9 per page

## Running Locally

```bash
git clone https://github.com/yayaq1/qr-code-generator.git
cd qr-code-generator
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Built With

- Next.js 15
- TypeScript
- Tailwind CSS
- react-qr-code

## Contributing

Feel free to contribute! Open an issue or submit a pull request if you have ideas for improvements.

## License

MIT