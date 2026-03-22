import * as React from "react";
import { setIcon } from "obsidian";
import { createPortal } from "react-dom";
import type { SessionModelState } from "../../domain/models/chat-session";

const { useEffect, useMemo, useRef, useState, useCallback } = React;

interface ModelSearchSelectorProps {
	models?: SessionModelState;
	onModelChange?: (modelId: string) => void;
}

const POPOVER_MARGIN = 12;
const POPOVER_GAP = 8;

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
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
	const pickerRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

	const filteredModels = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) return availableModels;

		const scored = availableModels
			.map((model) => {
				const name = model.name.toLowerCase();
				const modelId = model.modelId.toLowerCase();
				const description = model.description?.toLowerCase() ?? "";

				let score = 0;
				if (name === normalizedQuery) score += 100;
				if (modelId === normalizedQuery) score += 100;
				if (name.startsWith(normalizedQuery)) score += 50;
				if (modelId.startsWith(normalizedQuery)) score += 50;
				if (name.includes(normalizedQuery)) score += 20;
				if (modelId.includes(normalizedQuery)) score += 20;
				if (description.includes(normalizedQuery)) score += 10;

				if (score === 0) return null;
				return { model, score };
			})
			.filter(
				(
					item,
				): item is {
					model: NonNullable<typeof availableModels>[number];
					score: number;
				} => item != null,
			)
			.sort((a, b) => b.score - a.score);

		return scored.map((item) => item.model);
	}, [availableModels, query]);

	const currentFilteredIndex = useMemo(
		() =>
			filteredModels.findIndex(
				(model) => model.modelId === currentModelId,
			),
		[filteredModels, currentModelId],
	);

	const updatePopoverPosition = useCallback(() => {
		const triggerEl = triggerRef.current;
		if (!triggerEl) return;

		const rect = triggerEl.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const width = Math.min(640, viewportWidth - POPOVER_MARGIN * 2);
		const left = Math.min(
			Math.max(POPOVER_MARGIN, rect.right - width),
			viewportWidth - width - POPOVER_MARGIN,
		);

		const spaceBelow =
			viewportHeight - rect.bottom - POPOVER_GAP - POPOVER_MARGIN;
		const spaceAbove = rect.top - POPOVER_GAP - POPOVER_MARGIN;
		const minVisibleHeight = 240;
		const useBelow =
			spaceBelow >= minVisibleHeight || spaceBelow >= spaceAbove;
		const availableHeight = useBelow ? spaceBelow : spaceAbove;
		const maxHeight = Math.max(180, Math.min(520, availableHeight));
		const top = useBelow
			? rect.bottom + POPOVER_GAP
			: Math.max(POPOVER_MARGIN, rect.top - POPOVER_GAP - maxHeight);

		setPopoverStyle({
			position: "fixed",
			top,
			left,
			width,
			maxHeight,
			zIndex: 1000,
		});
	}, []);

	useEffect(() => {
		if (!isOpen) return;
		updatePopoverPosition();

		const handlePointerDown = (event: MouseEvent) => {
			if (pickerRef.current?.contains(event.target as Node)) return;
			setIsOpen(false);
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		};

		const handleReposition = () => updatePopoverPosition();

		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		window.addEventListener("resize", handleReposition);
		window.addEventListener("scroll", handleReposition, true);

		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("resize", handleReposition);
			window.removeEventListener("scroll", handleReposition, true);
		};
	}, [isOpen, updatePopoverPosition]);

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
			setSelectedIndex(0);
		}
	}, [models]);

	useEffect(() => {
		if (!isOpen) return;
		if (filteredModels.length === 0) {
			setSelectedIndex(0);
			return;
		}

		if (currentFilteredIndex >= 0) {
			setSelectedIndex(currentFilteredIndex);
			return;
		}

		setSelectedIndex((prev) => Math.min(prev, filteredModels.length - 1));
	}, [isOpen, filteredModels, currentFilteredIndex]);

	useEffect(() => {
		if (!isOpen) return;
		const selectedEl = itemRefs.current[selectedIndex];
		selectedEl?.scrollIntoView({ block: "nearest" });
	}, [isOpen, selectedIndex]);

	if (!models || models.availableModels.length <= 1) {
		return null;
	}

	const selectModel = (modelId: string) => {
		setIsOpen(false);
		setQuery("");
		onModelChange?.(modelId);
	};

	const moveSelection = (delta: number) => {
		if (filteredModels.length === 0) return;
		setSelectedIndex((prev) => {
			const next =
				(prev + delta + filteredModels.length) % filteredModels.length;
			return next;
		});
	};

	const handleSearchKeyDown = (
		event: React.KeyboardEvent<HTMLInputElement>,
	) => {
		if (filteredModels.length === 0) return;

		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				moveSelection(1);
				break;
			case "ArrowUp":
				event.preventDefault();
				moveSelection(-1);
				break;
			case "Enter":
				event.preventDefault();
				selectModel(filteredModels[selectedIndex].modelId);
				break;
			case "Home":
				event.preventDefault();
				setSelectedIndex(0);
				break;
			case "End":
				event.preventDefault();
				setSelectedIndex(filteredModels.length - 1);
				break;
		}
	};

	const popover = isOpen
		? createPortal(
				<div
					className="agent-client-model-selector-popover"
					role="dialog"
					aria-label="Model selector"
					style={popoverStyle}
				>
					<div className="agent-client-model-selector-search-row">
						<input
							ref={searchInputRef}
							type="text"
							className="agent-client-model-selector-search"
							placeholder="Search models..."
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							onKeyDown={handleSearchKeyDown}
						/>
						<div className="agent-client-model-selector-search-meta">
							{filteredModels.length} / {availableModels.length}
						</div>
					</div>

					<div
						className="agent-client-model-selector-list"
						role="listbox"
						aria-label="Available models"
					>
						{filteredModels.length > 0 ? (
							filteredModels.map((model, index) => {
								const isSelected =
									model.modelId === currentModelId;
								const isActive = index === selectedIndex;
								return (
									<button
										key={model.modelId}
										type="button"
										ref={(el) => {
											itemRefs.current[index] = el;
										}}
										className={
											"agent-client-model-selector-item " +
											(isSelected
												? "agent-client-selected "
												: "") +
											(isActive
												? "agent-client-active"
												: "")
										}
										onMouseEnter={() =>
											setSelectedIndex(index)
										}
										onMouseDown={(event) => {
											event.preventDefault();
											selectModel(model.modelId);
										}}
										title={model.description ?? model.name}
										role="option"
										aria-selected={isSelected}
									>
										<div className="agent-client-model-selector-item-header">
											<span className="agent-client-model-selector-item-name">
												{model.name}
											</span>
											<span className="agent-client-model-selector-item-id">
												{model.modelId}
											</span>
										</div>
										{model.description && (
											<div className="agent-client-model-selector-item-description">
												{model.description}
											</div>
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
				</div>,
				document.body,
			)
		: null;

	return (
		<div
			className="agent-client-model-selector"
			ref={pickerRef}
			title={currentModel?.description ?? "Select model"}
		>
			<button
				type="button"
				className="agent-client-model-selector-trigger"
				ref={triggerRef}
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
			{popover}
		</div>
	);
}
