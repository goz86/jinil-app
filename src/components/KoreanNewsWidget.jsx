import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const KoreanNewsWidget = () => {
  const { t } = useLanguage();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        let data;

        // 1. Electron Desktop mode (production/unpacked)
        if (window.electronAPI && window.electronAPI.fetchNews) {
          data = await window.electronAPI.fetchNews();
        }
        // 2. Browser Dev mode (localhost:5173 - uses Vite proxy)
        else {
          const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const rssUrl = "https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko";
          const fetchUrl = isDev ? "/api/googlenews/rss?hl=ko&gl=KR&ceid=KR:ko" : rssUrl;

          const response = await fetch(fetchUrl);
          if (!response.ok) {
            throw new Error('Failed to fetch news feed');
          }
          data = await response.text();
        }

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, "text/xml");

        const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 5).map(node => ({
          title: node.querySelector("title")?.textContent || "No title",
          link: node.querySelector("link")?.textContent || "#",
          pubDate: node.querySelector("pubDate")?.textContent || new Date().toISOString()
        }));

        if (items.length > 0) {
          setNews(items);
        } else {
          throw new Error("No news items found in feed");
        }

      } catch (err) {
        console.error("Error fetching Korean news:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    const intervalId = setInterval(fetchNews, 10 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mt-6 transition-colors duration-300">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <h3 className="font-bold text-gray-800 dark:text-white">{t('koreanNews')}</h3>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-2">{t('loadingNews')}</div>
      ) : error ? (
        <div className="text-sm text-red-500 py-2">Error loading news.</div>
      ) : news.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-2">No news available.</div>
      ) : (
        <ul className="space-y-3">
          {news.map((item, index) => (
            <li key={index} className="border-b border-gray-50 dark:border-gray-700 last:border-0 pb-2 last:pb-0">
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2 transition-colors duration-200"
                title={item.title}
              >
                {item.title}
              </a>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {new Date(item.pubDate).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default KoreanNewsWidget;
