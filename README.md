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