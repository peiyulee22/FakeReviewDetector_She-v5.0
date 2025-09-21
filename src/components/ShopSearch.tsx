import { useState } from "react";

const GOOGLE_API_KEY = "AIzaSyCFnknlZdtR9EA_X2V3DxqzlvLdrTHvLtk";

type ShopSearchProps = {
  onSelectShop: (name: string) => void; // only return the shop name
};

const ShopSearch = ({ onSelectShop }: ShopSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${query}&key=${GOOGLE_API_KEY}`
    );
    const data = await res.json();

    // only keep the descriptions (shop names)
    const names = data.predictions?.map((p: any) => p.description) || [];
    setResults(names);
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search shop..."
      />
      <button onClick={handleSearch}>Search</button>

      {/* Results column */}
      {results.length > 0 && (
        <div className="mt-2 border rounded p-2">
          {results.map((name, idx) => (
            <div
              key={idx}
              className="cursor-pointer hover:bg-gray-100 p-1"
              onClick={() => onSelectShop(name)} // send name only
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShopSearch;
