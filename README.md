# Solana Tweeter 🌐

A decentralized Twitter clone built on the Solana blockchain with a beautiful dark, elegant, and professional UI.

## Features ✨

- **Dark Theme**: Professional dark interface with glass morphism effects
- **Solana Integration**: Connect with Phantom, Solflare, and other Solana wallets
- **Decentralized**: All tweets are stored on the Solana blockchain
- **Real-time**: Live updates from the blockchain
- **Responsive**: Works on desktop and mobile devices
- **Professional UI**: Modern design with smooth animations

## Tech Stack 🛠️

- **Frontend**: Vue.js 3 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom dark theme
- **Blockchain**: Solana (Anchor framework)
- **Wallets**: Solana Wallet Adapter
- **Deployment**: Vercel

## Development 🚀

### Prerequisites
- Node.js 16+
- Yarn package manager
- Solana CLI tools
- Anchor framework

### Local Development

1. **Install dependencies**:
   ```bash
   yarn install
   ```

2. **Start the development server**:
   ```bash
   yarn dev
   ```

3. **Open your browser**:
   Navigate to `http://localhost:3000`

### Available Scripts

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn preview` - Preview production build
- `yarn lint` - Run linter
- `yarn lint:fix` - Fix linting issues

## Deployment 🚀

### Vercel Deployment

This project is configured for Vercel deployment with the following setup:

- **Root Directory**: `app/` (configured in `vercel.json`)
- **Build Command**: `cd app && yarn build`
- **Output Directory**: `app/dist`
- **Framework**: Vite

### Deployment Steps

1. **Connect to Vercel**:
   - Import your GitHub repository to Vercel
   - Vercel will automatically detect the `vercel.json` configuration

2. **Build Settings** (if needed):
   - **Root Directory**: Leave empty (uses root)
   - **Build Command**: `cd app && yarn build`
   - **Output Directory**: `app/dist`
   - **Install Command**: `cd app && yarn install`

3. **Environment Variables** (if needed):
   - Add any required environment variables in Vercel dashboard

4. **Deploy**:
   - Vercel will automatically build and deploy using the configuration

## Project Structure 📁

```
├── app/                    # Frontend application
│   ├── src/
│   │   ├── components/    # Vue components
│   │   ├── pages/         # Page components
│   │   ├── api/          # API functions
│   │   ├── hooks/        # Vue composables
│   │   └── idl/          # Solana program IDL
│   ├── public/           # Static assets
│   └── package.json      # Frontend dependencies
├── programs/             # Solana program (Rust)
├── tests/               # Test files
├── vercel.json          # Vercel configuration
└── package.json         # Root package.json
```

## Customization 🎨

### Theme Colors
The application uses a custom dark theme with the following color palette:
- **Dark**: `#020617` to `#f8fafc`
- **Accent**: Purple gradient (`#d946ef` to `#a21caf`)
- **Solana**: Blue gradient (`#0ea5e9` to `#082f49`)

### Logo and Favicon
- Logo: `app/public/logo.png`
- Favicon: `app/public/favicon.ico`

## Contributing 🤝

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License 📄

This project is open source and available under the MIT License.

## Support 💬

For support and questions, please open an issue on GitHub.

---

Built with ❤️ on Solana