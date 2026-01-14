/**
 * ContextSelector Component
 * 
 * Robust dropdown for selecting UCRs to compare.
 * Fixes the issue where the original Select component wasn't working.
 */

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Plus,
  X,
  Search,
  ChevronDown,
  Building2,
  Check,
  Loader2,
} from "lucide-react";
import type { Configuration } from "@shared/schema";

interface ContextSelectorProps {
  configurations: Configuration[];
  selectedIds: number[];
  onSelect: (id: number) => void;
  onRemove: (id: number) => void;
  maxSelections?: number;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ContextSelector({
  configurations,
  selectedIds,
  onSelect,
  onRemove,
  maxSelections = 4,
  isLoading = false,
  disabled = false,
}: ContextSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter available configurations
  const availableConfigs = configurations.filter(
    (c) => !selectedIds.includes(Number(c.id))
  );

  const filteredConfigs = availableConfigs.filter((config) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const name = config.name?.toLowerCase() || "";
    const domain = config.brand?.domain?.toLowerCase() || "";
    return name.includes(query) || domain.includes(query);
  });

  const canAddMore = selectedIds.length < maxSelections;

  const handleSelect = (id: number) => {
    if (canAddMore) {
      onSelect(id);
      setSearchQuery("");
      if (selectedIds.length + 1 >= maxSelections) {
        setIsOpen(false);
      }
    }
  };

  const getConfigName = (id: number) => {
    const config = configurations.find((c) => Number(c.id) === id);
    return config?.name || config?.brand?.domain || `ID: ${id}`;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Selected Items */}
      <div className="flex flex-wrap items-center gap-2">
        {selectedIds.map((id) => (
          <Badge
            key={id}
            variant="secondary"
            className="flex items-center gap-1.5 py-1.5 px-3 text-sm"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span className="max-w-[120px] truncate">{getConfigName(id)}</span>
            <button
              type="button"
              onClick={() => onRemove(id)}
              className="ml-1 rounded-full hover:bg-muted p-0.5"
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        {/* Add Button / Dropdown Trigger */}
        {canAddMore && (
          <div className="relative">
            <Button
              ref={triggerRef}
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              disabled={disabled || isLoading || availableConfigs.length === 0}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add Context
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </Button>

            {/* Dropdown */}
            {isOpen && (
              <div
                ref={dropdownRef}
                className="absolute top-full left-0 mt-2 w-72 bg-popover border rounded-lg shadow-lg z-50"
              >
                {/* Search */}
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search contexts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-9"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Options */}
                <ScrollArea className="max-h-64">
                  <div className="p-1">
                    {filteredConfigs.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        {searchQuery
                          ? "No contexts match your search"
                          : "No more contexts available"}
                      </div>
                    ) : (
                      filteredConfigs.map((config) => {
                        const isSelected = selectedIds.includes(Number(config.id));
                        return (
                          <button
                            key={config.id}
                            type="button"
                            onClick={() => handleSelect(Number(config.id))}
                            disabled={isSelected}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors",
                              "hover:bg-accent hover:text-accent-foreground",
                              "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                              isSelected && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {config.name || "Unnamed Context"}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {config.brand?.domain || "No domain"}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>

                {/* Footer */}
                <div className="p-2 border-t bg-muted/30">
                  <div className="text-xs text-muted-foreground text-center">
                    {selectedIds.length}/{maxSelections} contexts selected
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Max reached indicator */}
        {!canAddMore && (
          <Badge variant="outline" className="text-xs">
            Maximum {maxSelections} contexts
          </Badge>
        )}
      </div>

      {/* Empty state */}
      {selectedIds.length === 0 && !isLoading && (
        <div className="text-sm text-muted-foreground">
          Select 2-4 contexts to compare them side-by-side
        </div>
      )}
    </div>
  );
}
