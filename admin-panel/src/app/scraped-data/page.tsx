import { ScrapedDataView } from "./ScrapedDataView";

export default function ScrapedDataPage() {
  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">Show Scraped Data</h1>
      <ScrapedDataView />
    </div>
  );
}
