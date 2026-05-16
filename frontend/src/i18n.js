import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        translation: {
          dashboard: {
            title: "Executive Dashboard",
            totalSales: "Total Sales",
            activeUsers: "Active Users",
            forecastAccuracy: "Forecast Accuracy"
          }
        }
      },
      es: {
        translation: {
          dashboard: {
            title: "Panel Ejecutivo",
            totalSales: "Ventas Totales",
            activeUsers: "Usuarios Activos",
            forecastAccuracy: "Precisión del Pronóstico"
          }
        }
      }
    }
  });

export default i18n;
