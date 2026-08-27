interface TagFilterProps {
  allTags: string[];
  activeTags: Set<string>;
  onToggle: (tag: string) => void;
}

export function TagFilter({ allTags, activeTags, onToggle }: TagFilterProps) {
  return (
    <div className="tag-filter" role="group" aria-label="Фильтр по тегам">
      {allTags.map((tag) => (
        <label key={tag}>
          <input
            type="checkbox"
            checked={activeTags.has(tag)}
            onChange={() => onToggle(tag)}
          />
          {tag}
        </label>
      ))}
    </div>
  );
}
