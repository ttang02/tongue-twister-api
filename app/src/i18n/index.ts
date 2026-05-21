import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import fr from './fr.json'
import en from './en.json'
import ko from './ko.json'
import vi from './vi.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { fr: { translation: fr }, en: { translation: en }, ko: { translation: ko }, vi: { translation: vi } },
    fallbackLng: 'en',
    supportedLngs: ['fr', 'en', 'ko', 'vi'],
    interpolation: { escapeValue: false },
  })

export default i18n
