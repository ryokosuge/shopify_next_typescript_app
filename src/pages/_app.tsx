import type { AppContext, AppInitialProps, AppProps } from 'next/app'
import App from "next/app";
import { AppProvider } from "@shopify/polaris";
import translations from "@shopify/polaris/locales/ja.json";
import "@shopify/polaris/dist/styles.css";
import { Provider } from '@shopify/app-bridge-react';

const MyApp = ({ Component, pageProps }: AppProps) => {
  const config = {
    apiKey: SHOPIFY_API_KEY,
    host: pageProps.host,
    forceRedirect: true
  }
  return (
    <AppProvider i18n={translations}>
      <Provider config={config}>
        <Component {...pageProps} />
      </Provider>
    </AppProvider>
  );
}

MyApp.getInitialProps = async (appContext: AppContext): Promise<AppInitialProps> => {
  const host = appContext.ctx.query.host as string;
  const appProps = await App.getInitialProps(appContext);
  return {
    ...appProps,
    pageProps: {
      host
    },
  }
}

export default MyApp
