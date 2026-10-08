/**
 * @neon-law-source-code/navigator-ux — a React component library for legal
 * work, on the Neon Law teal.
 *
 * Copyright 2026 Shook Law PLLC
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE.
 * Third-party material shipped alongside it keeps its own terms — see
 * THIRD-PARTY-NOTICES.md.
 */

// The base stylesheet: fonts, the token contract, and every component rule.
// One identity ships. A brand layer is something your app writes for itself —
// see the library README for the template.
import './styles/theme.css'

export { ThemeProvider, useTheme, type Theme, type ThemeProviderProps } from './theme/ThemeProvider'

/* -- The public surface: chrome, marketing blocks, and forms, in nav-* ------ */

export { Icon, ICON_NAMES, type IconName, type IconProps } from './components/Icon'
export {
  Card,
  PricingCard,
  PricingGrid,
  TestimonialCard,
  TestimonialGrid,
  TestimonialSection,
  type CardProps,
  type PricingCardProps,
  type PricingGridProps,
  type TestimonialCardProps,
  type TestimonialSectionProps,
} from './components/Surfaces'
export {
  Alert,
  Flash,
  ImpersonationBanner,
  LegalDisclaimer,
  Toast,
  type AlertProps,
  type FlashProps,
  type FlashTone,
  type ImpersonationBannerProps,
  type LegalDisclaimerProps,
  type ToastProps,
  type ToastTone,
} from './components/Feedback'
export {
  Breadcrumb,
  ExternalLink,
  NavBadge,
  NavButton,
  NavLinkButton,
  type BreadcrumbItem,
  type BreadcrumbProps,
  type ButtonSize,
  type ButtonVariant,
  type ExternalLinkProps,
  type NavButtonProps,
  type NavLinkButtonProps,
} from './components/Navigation'
export {
  DataTable,
  Pagination,
  RowActions,
  type DataColumn,
  type DataTableProps,
  type PaginationProps,
  type RowAction,
  type RowActionLink,
  type RowActionPost,
  type RowActionsProps,
  type SortDirection,
} from './components/DataTable'
export { ConfirmDelete, type ConfirmDeleteProps } from './components/ConfirmDelete'
export {
  CheckboxField,
  FormCard,
  PeopleList,
  RadioGroup,
  SelectField,
  TextField,
  TextareaField,
  type CheckboxFieldProps,
  type FormCardProps,
  type PeopleListProps,
  type Person,
  type RadioChoice,
  type RadioGroupProps,
  type SelectFieldProps,
  type SelectOption,
  type TextFieldProps,
  type TextareaFieldProps,
} from './components/Form'
export {
  NavigatorFooter,
  NavigatorNavbar,
  NavigatorShell,
  PageHeader,
  POWERED_BY_NEON_LAW_NAVIGATOR,
  PublicShell,
  SiteFooter,
  SiteHeader,
  type ChromeLink,
  type FooterOffice,
  type NavigatorFooterBrand,
  type NavigatorFooterProps,
  type NavigatorNavbarProps,
  type PageHeaderProps,
  type ShellFrameProps,
  type SiteFooterProps,
  type SiteHeaderProps,
} from './components/Chrome'
export {
  BrandColorField,
  BrandEditorPanel,
  BrandFontUploadField,
  BrandLogoUploadField,
  evaluateBrandPrimaryColor,
  FONT_LICENCES,
  type BrandColorEvaluation,
  type BrandColorFieldProps,
  type BrandEditorPanelProps,
  type BrandFontUploadFieldProps,
  type BrandLicence,
  type BrandLogoUploadFieldProps,
} from './components/BrandEditor'
export { Prose, Runs, type ProseProps, type Run, type RunStyle, type RunsProps } from './components/Prose'

/* -- The shadcn-derived set. A superset of the Dioxus surface: none of these --
 * -- has a counterpart in the legacy static surface. Same three contracts,   --
 * -- no Tailwind, no Radix, no runtime dependency.                           -- */

export {
  Accordion,
  Collapsible,
  type AccordionItem,
  type AccordionProps,
  type CollapsibleProps,
} from './components/Disclosure'
export {
  AspectRatio,
  Avatar,
  Progress,
  Separator,
  Skeleton,
  type AspectRatioProps,
  type AvatarProps,
  type ProgressProps,
  type SeparatorProps,
  type SkeletonProps,
} from './components/Display'
export { initialsFor } from './lib/initials'
export {
  parseJsonApiSort,
  serializeJsonApiSort,
  toggleJsonApiSort,
  type SortDescriptor,
  type ToggleJsonApiSortOptions,
} from './lib/json-api-sort'
export {
  Combobox,
  Switch,
  ToggleGroup,
  type ComboboxProps,
  type SwitchProps,
  type ToggleGroupProps,
  type ToggleOption,
} from './components/Controls'
export {
  LinkTabs,
  Tabs,
  type LinkTab,
  type LinkTabsProps,
  type TabItem,
  type TabsProps,
} from './components/Tabs'
export {
  Dialog,
  DropdownMenu,
  Popover,
  Sheet,
  Tooltip,
  type DialogProps,
  type DropdownMenuProps,
  type MenuItem,
  type PopoverProps,
  type SheetProps,
  type TooltipProps,
} from './components/Overlay'
export { Toaster, type ToasterProps } from './components/Toaster'
export {
  NavigationChords,
  ShortcutHelp,
  ShortcutHost,
  ShortcutList,
  ShortcutProvider,
  useShortcut,
  useShortcutList,
  useShortcutRegistry,
  type NavigationChordsProps,
  type ShortcutListProps,
  type ShortcutProviderProps,
} from './components/Shortcuts'
export {
  NAVIGATION_CHORDS,
  chordsFor,
  type NavigationChord,
  type NavigationHrefs,
  type NavigationPage,
} from './lib/navigation-chords'
export {
  createShortcutRegistry,
  defaultShortcutRegistry,
  formatKey,
  isEditableTarget,
  matchesKey,
  type Shortcut,
  type ShortcutEntry,
  type ShortcutRegistry,
  type ShortcutRegistryOptions,
  type ShortcutScope,
} from './lib/shortcuts'
export {
  useToasts,
  type ToastOptions,
  type ToastRecord,
  type UseToasts,
} from './lib/use-toasts'

/* -- The second shadcn wave, plus the two surfaces that carry a dependency. --
 * -- Table through Menubar are platform-built like the set above. Charts,   --
 * -- GraphView, and PdfViewer are the exceptions: d3 and pdf.js are real    --
 * -- dependencies, externalized in the build so a consumer resolves one     --
 * -- copy. See the note in AGENTS.md for what changed and why.              -- */

export {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  type TableCellProps,
  type TableProps,
  type TableRowProps,
} from './components/Table'
export { Empty, Kbd, Spinner, type EmptyProps, type KbdProps, type SpinnerProps } from './components/Indicators'
export {
  ButtonGroup,
  Carousel,
  CarouselItem,
  Field,
  Item,
  ScrollArea,
  type ButtonGroupProps,
  type CarouselProps,
  type FieldProps,
  type ItemProps,
  type ScrollAreaProps,
} from './components/Layouts'
export {
  ChoiceGroup,
  Hero,
  Stage,
  StepList,
  Stepper,
  type Choice,
  type ChoiceGroupProps,
  type HeroProps,
  type HeroImage,
  type HeroImageSource,
  type StageProps,
  type StageWidth,
  type Step,
  type StepListProps,
  type StepperProps,
} from './components/Focus'
export {
  Calendar,
  CalendarPicker,
  DatePicker,
  InputOTP,
  Slider,
  type CalendarDay,
  type CalendarPickerProps,
  type CalendarProps,
  type DatePickerProps,
  type InputOTPProps,
  type SliderProps,
} from './components/Fields'
export {
  ContextMenu,
  HoverCard,
  Menubar,
  type ContextMenuItem,
  type ContextMenuProps,
  type HoverCardProps,
  type MenubarMenu,
  type MenubarProps,
} from './components/Menus'
export {
  AreaChart,
  BarChart,
  ChartLegend,
  LineChart,
  PieChart,
  type ChartLegendProps,
  type ChartPoint,
  type ChartProps,
  type PieChartProps,
} from './components/Charts'
export { WorldMap, type MapValue, type WorldMapProps } from './components/WorldMap'
export { LocationMap, type LocationMapFeature, type LocationMapProps } from './components/LocationMap'
export {
  GraphView,
  type GraphEdge,
  type GraphNode,
  type GraphViewProps,
} from './components/GraphView'
export { PdfViewer, type PdfViewerProps } from './components/PdfViewer'

export { useDismissible, type DismissibleOptions } from './lib/use-dismissible'
export { SERIES_COUNT, seriesColor } from './lib/chart-series'
export { dateHeading, monthHeading, monthOf, monthShape, parseMonth, shiftDate, shiftMonth, weekdayIndex } from './lib/month'

/* ------------------------------ Matter surfaces, on the new token layer -- */

export { SessionProvider, useSession, type SessionProviderProps } from './session/SessionProvider'
export {
  fetchSession,
  isExpired,
  nowUnix,
  redirectToLogin,
  secondsRemaining,
  LOGIN_PATH,
  SESSION_ENDPOINT,
  type Session,
  type SessionRole,
} from './session/session'
export {
  API_PREFIX,
  ApiRequestError,
  apiFetch,
  type ApiFetchOptions,
  type ApiMethod,
  type ApiPath,
  type ApiSuccess,
} from './api/client'
export type { components as ApiComponents, paths as ApiPaths } from './api/schema'

export { CaseNav, type CaseNavLink, type CaseNavProps } from './components/CaseNav'
export {
  CaseHead,
  Layout,
  Shell,
  Stack,
  type CaseHeadProps,
  type LayoutProps,
  type ShellProps,
} from './components/Shell'
export { ReviewNav, type ReviewNavItem, type ReviewNavProps } from './components/ReviewNav'
export {
  Badge,
  Button,
  ButtonRow,
  Callout,
  LinkButton,
  Panel,
  type BadgeProps,
  type BadgeTone,
  type ButtonProps,
  type CalloutProps,
  type CalloutTone,
  type LinkButtonProps,
  type PanelProps,
} from './components/Primitives'
export { Decision, DecisionGrid, type DecisionProps, type DecisionTone } from './components/Decision'
export { DraftCard, type DraftCardProps } from './components/DraftCard'
export {
  AuthorityDialog,
  AuthorityList,
  type Authority,
  type AuthorityJump,
  type AuthorityListProps,
} from './components/AuthorityDialog'
export { SourceThread, type SourceMessage, type SourceThreadProps } from './components/SourceThread'
export {
  HarvardOutlineViewer,
  type HarvardOutlineBlock,
  type HarvardOutlineRun,
  type HarvardOutlineSection,
  type HarvardOutlineViewerProps,
} from './components/HarvardOutline'
export { NotationViewer, type NotationViewerProps } from './components/NotationViewer'
export {
  Notation,
  type NotationProps,
  type NotationSectionsProps,
  type NotationSourceProps,
} from './components/Notation'
export {
  deriveNotationChecklist,
  parseNotation,
  parseNotationDocument,
  type NotationOpenTerm,
  type NotationChecklistStep,
  type ParsedNotationDocument,
} from './lib/notation'
export {
  CiteTheRecord,
  RecordCite,
  type CiteTheRecordProps,
  type RecordCitation,
  type RecordCiteProps,
} from './components/CiteTheRecord'
export {
  Feed,
  type FeedAccent,
  type FeedPost,
  type FeedProps,
  type FeedSource,
} from './components/Feed'
export {
  Chat,
  ChatComposer,
  type ChatComposerProps,
  type ChatMessage,
  type ChatPart,
  type ChatProps,
  type ChatRole,
  type ChatToolCall,
  type ChatToolKind,
  type ChatToolStatus,
} from './components/Chat'
export { ClaimTable, type ClaimTableColumn, type ClaimTableProps } from './components/ClaimTable'
export {
  ActionList,
  DownloadCard,
  DownloadGrid,
  FactCard,
  FactGrid,
  Record,
  StatusStrip,
  type ActionItem,
  type DownloadCardProps,
  type FactCardProps,
  type RecordProps,
  type StatusCellProps,
  type StatusTone,
} from './components/Cards'
