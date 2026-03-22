import * as React from "react";
import { setIcon } from "obsidian";
import type { SessionModelState } from "../../domain/models/chat-session";

const { useEffect, useMemo, useRef, useState } = React;

interface ModelSearchSelectorProps {
	models?: SessionModelState;
	onModelChange?: (modelId: string) => void;
}

export function ModelSearchSelector({
	models,
	onModelChange,
}: ModelSearchSelectorProps) {
	const availableModels = models?.availableModels ?? [];
	const currentModelId = models?.currentModelId;

	const currentModel = useMemo(
		() =>
			availableModels.find((model) => model.modelId === currentModelId) ??
			null,
		[availableModels, currentModelId],
	);

	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState("");
	const pickerRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	const filteredModels = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) return availableModels;

		return availableModels.filter((model) => {
			return (
				model.name.toLowerCase().includes(normalizedQuery) ||
				model.modelId.toLowerCase().includes(normalizedQuery) ||
				(model.description?.toLowerCase().includes(normalizedQuery) ?? false)
			);
		});
	}, [availableModels, query]);

	useEffect(() => {
		if (!isOpen) return;

		const handlePointerDown = (event: MouseEvent) => {
			if (pickerRef.current?.contains(event.target as Node)) return;
			setIsOpen(false);
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	useEffect(() => {
		if (isOpen) {
			searchInputRef.current?.focus();
			searchInputRef.current?.select();
		}
	}, [isOpen]);

	useEffect(() => {
		if (!models || models.availableModels.length <= 1) {
			setIsOpen(false);
			setQuery("");
		}
	}, [models]);

	if (!models || models.availableModels.length <= 1) {
		return null;
	}

	return (
		<div
			className="agent-client-model-selector"
			ref={pickerRef}
			title={currentModel?.description ?? "Select model"}
		>
			<button
				type="button"
				className="agent-client-model-selector-trigger"
				onClick={() => {
					setIsOpen((open) => {
						const nextOpen = !open;
						if (nextOpen) setQuery("");
						return nextOpen;
					});
				}}
				aria-expanded={isOpen}
				aria-label="Select model"
			>
				<span className="agent-client-model-selector-label">
					{currentModel?.name ?? "Select model"}
				</span>
				<span
					className="agent-client-model-selector-icon"
					ref={(el) => {
						if (el) setIcon(el, "chevron-down");
					}}
				/>
			</button>

			{isOpen && (
				<div className="agent-client-model-selector-popover">
					<input
						ref={searchInputRef}
						type="text"
						className="agent-client-model-selector-search"
						placeholder="Search models..."
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
					<div className="agent-client-model-selector-list">
						{filteredModels.length > 0 ? (
							filteredModels.map((model) => {
								const isSelected = model.modelId === currentModelId;
								return (
									<button
										key={model.modelId}
										type="button"
										className={
											"agent-client-model-selector-item " +
											(isSelected ? "agent-client-selected" : "")
										}
										onMouseDown={(event) => {
											event.preventDefault();
											setIsOpen(false);
											setQuery("");
											onModelChange?.(model.modelId);
										}}
										title={model.description ?? model.name}
									>
										<span className="agent-client-model-selector-item-name">
											{model.name}
										</span>
										<span className="agent-client-model-selector-item-id">
											{model.modelId}
										</span>
										{model.description && (
											<span className="agent-client-model-selector-item-description">
												{model.description}
											</span>
										)}
									</button>
								);
							})
						) : (
							<div className="agent-client-model-selector-empty">
								No models match your search.
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
