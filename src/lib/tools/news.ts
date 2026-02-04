
import { XMLParser } from "fast-xml-parser";

// Tool definition for Gemini
export const newsTools = [
    {
        name: "get_google_news",
        description: "Fetches the latest news from Google News Argentina. Can be used to get top stories or search for specific topics.",
        parameters: {
            type: "OBJECT",
            properties: {
                query: {
                    type: "STRING",
                    description: "Optional search query (e.g., 'Dolar', 'Selección Argentina', 'Tecnología'). If omitted, returns top headlines."
                }
            },
            required: []
        }
    }
];

export async function getGoogleNews(query?: string) {
    try {
        const baseUrl = "https://news.google.com/rss";
        const params = new URLSearchParams({
            hl: "es-419",
            gl: "AR",
            ceid: "AR:es-419"
        });

        let url = `${baseUrl}?${params.toString()}`;

        if (query) {
            url = `${baseUrl}/search?q=${encodeURIComponent(query)}&${params.toString()}`;
        }

        console.log(`📰 Fetching news from: ${url}`);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch news: ${response.statusText}`);
        }

        const xmlData = await response.text();
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        });
        const jsonObj = parser.parse(xmlData);

        const items = jsonObj?.rss?.channel?.item || [];

        // Return top 5-7 articles to avoid overwhelming the context
        const articles = items.slice(0, 7).map((item: any) => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            source: item.source ? item.source["#text"] || item.source : "Google News"
        }));

        return articles;

    } catch (error: any) {
        console.error("Error fetching Google News:", error);
        return { error: `Error fetching news: ${error.message}` };
    }
}
