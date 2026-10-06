'use client'
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import { Loading } from '@/components/ui'
import type { ToolScreen } from '@/features/tools/hub/types/tool.types'
const DocToolsPage = dynamic(() => import('@/features/tools/pdf/pages/DocToolsPage'), { ssr: false, loading: () => <Loading /> })
const MergePdfPage = dynamic(() => import('@/features/tools/pdf/pages/quick/MergePdfPage'), { ssr: false, loading: () => <Loading /> })
const SplitPdfPage = dynamic(() => import('@/features/tools/pdf/pages/quick/SplitPdfPage'), { ssr: false, loading: () => <Loading /> })
const CompressPdfPage = dynamic(() => import('@/features/tools/pdf/pages/quick/CompressPdfPage'), { ssr: false, loading: () => <Loading /> })
const ConvertFilePage = dynamic(() => import('@/features/tools/pdf/pages/quick/ConvertFilePage'), { ssr: false, loading: () => <Loading /> })
const PdfToImagePage = dynamic(() => import('@/features/tools/pdf/pages/quick/PdfToImagePage'), { ssr: false, loading: () => <Loading /> })
const OrganizePdfPage = dynamic(() => import('@/features/tools/pdf/pages/quick/OrganizePdfPage'), { ssr: false, loading: () => <Loading /> })
const PageNumbersPage = dynamic(() => import('@/features/tools/pdf/pages/quick/PageNumbersPage'), { ssr: false, loading: () => <Loading /> })
const StampPdfPage = dynamic(() => import('@/features/tools/pdf/pages/quick/StampPdfPage'), { ssr: false, loading: () => <Loading /> })
const SignPdfPage = dynamic(() => import('@/features/tools/pdf/pages/quick/SignPdfPage'), { ssr: false, loading: () => <Loading /> })
const ComparePdfPage = dynamic(() => import('@/features/tools/pdf/pages/quick/ComparePdfPage'), { ssr: false, loading: () => <Loading /> })
const RedactPdfPage = dynamic(() => import('@/features/tools/pdf/pages/quick/RedactPdfPage'), { ssr: false, loading: () => <Loading /> })
const OcrPage = dynamic(() => import('@/features/tools/pdf/pages/quick/OcrPage'), { ssr: false, loading: () => <Loading /> })
const ImageToTextPage = dynamic(() => import('@/features/tools/pdf/pages/quick/ImageToTextPage'), { ssr: false, loading: () => <Loading /> })
const ImagesToPdfPage = dynamic(() => import('@/features/tools/pdf/pages/quick/ImagesToPdfPage'), { ssr: false, loading: () => <Loading /> })
const ConvertImagePage = dynamic(() => import('@/features/tools/image/pages/ConvertImagePage'), { ssr: false, loading: () => <Loading /> })
const CompressImagePage = dynamic(() => import('@/features/tools/image/pages/CompressImagePage'), { ssr: false, loading: () => <Loading /> })
const CropImagePage = dynamic(() => import('@/features/tools/image/pages/CropImagePage'), { ssr: false, loading: () => <Loading /> })
const BatchImagePage = dynamic(() => import('@/features/tools/image/pages/BatchImagePage'), { ssr: false, loading: () => <Loading /> })
const MarkImagePage = dynamic(() => import('@/features/tools/image/pages/MarkImagePage'), { ssr: false, loading: () => <Loading /> })
const IdPhotoPage = dynamic(() => import('@/features/tools/image/pages/IdPhotoPage'), { ssr: false, loading: () => <Loading /> })
const MeasureImagePage = dynamic(() => import('@/features/tools/image/pages/MeasureImagePage'), { ssr: false, loading: () => <Loading /> })
const QrCreatePage = dynamic(() => import('@/features/tools/qr/pages/QrCreatePage'), { ssr: false, loading: () => <Loading /> })
const QrReadPage = dynamic(() => import('@/features/tools/qr/pages/QrReadPage'), { ssr: false, loading: () => <Loading /> })
const BarcodeCreatePage = dynamic(() => import('@/features/tools/qr/pages/BarcodeCreatePage'), { ssr: false, loading: () => <Loading /> })
const QuickCalcPage = dynamic(() => import('@/features/tools/utility/pages/QuickCalcPage'), { ssr: false, loading: () => <Loading /> })
const MoneyCalcPage = dynamic(() => import('@/features/tools/utility/pages/MoneyCalcPage'), { ssr: false, loading: () => <Loading /> })
const DateCalcPage = dynamic(() => import('@/features/tools/utility/pages/DateCalcPage'), { ssr: false, loading: () => <Loading /> })
const UnitConvertPage = dynamic(() => import('@/features/tools/utility/pages/UnitConvertPage'), { ssr: false, loading: () => <Loading /> })
const CharCountPage = dynamic(() => import('@/features/tools/utility/pages/CharCountPage'), { ssr: false, loading: () => <Loading /> })
const ColorPage = dynamic(() => import('@/features/tools/utility/pages/ColorPage'), { ssr: false, loading: () => <Loading /> })
const RandomCodePage = dynamic(() => import('@/features/tools/utility/pages/RandomCodePage'), { ssr: false, loading: () => <Loading /> })
const QuickNotePage = dynamic(() => import('@/features/tools/utility/pages/QuickNotePage'), { ssr: false, loading: () => <Loading /> })
const HouseOrientationPage = dynamic(() => import('@/features/tools/orientation/pages/HouseOrientationPage'), { ssr: false, loading: () => <Loading /> })
const NumberWordsPage = dynamic(() => import('@/features/tools/vietnam/pages/NumberWordsPage'), { ssr: false, loading: () => <Loading /> })
const LoanPage = dynamic(() => import('@/features/tools/finance/pages/LoanPage'), { ssr: false, loading: () => <Loading /> })
const UnitPricePage = dynamic(() => import('@/features/tools/finance/pages/UnitPricePage'), { ssr: false, loading: () => <Loading /> })
const StudyPage = dynamic(() => import('@/features/tools/study/pages/StudyPage'), { ssr: false, loading: () => <Loading /> })
const PomodoroPage = dynamic(() => import('@/features/tools/study/pages/PomodoroPage'), { ssr: false, loading: () => <Loading /> })
const GroupSplitPage = dynamic(() => import('@/features/tools/finance/pages/GroupSplitPage'), { ssr: false, loading: () => <Loading /> })
const LegacyFontPage = dynamic(() => import('@/features/tools/vietnam/pages/LegacyFontPage'), { ssr: false, loading: () => <Loading /> })
const ReadAloudPage = dynamic(() => import('@/features/tools/accessibility/pages/ReadAloudPage'), { ssr: false, loading: () => <Loading /> })
const VietQrPage = dynamic(() => import('@/features/tools/qr/pages/VietQrPage'), { ssr: false, loading: () => <Loading /> })
const InvoiceXmlPage = dynamic(() => import('@/features/tools/vietnam/pages/InvoiceXmlPage'), { ssr: false, loading: () => <Loading /> })
const RemoveMetadataPage = dynamic(() => import('@/features/tools/image/pages/RemoveMetadataPage'), { ssr: false, loading: () => <Loading /> })
const CollagePage = dynamic(() => import('@/features/tools/image/pages/CollagePage'), { ssr: false, loading: () => <Loading /> })
const MessageRiskPage = dynamic(() => import('@/features/tools/safety/pages/MessageRiskPage'), { ssr: false, loading: () => <Loading /> })
const FlashcardPage = dynamic(() => import('@/features/tools/study/pages/FlashcardPage'), { ssr: false, loading: () => <Loading /> })
const HouseEstimatePage = dynamic(() => import('@/features/tools/construction/pages/HouseEstimatePage'), { ssr: false, loading: () => <Loading /> })
const DictationPage = dynamic(() => import('@/features/tools/accessibility/pages/DictationPage'), { ssr: false, loading: () => <Loading /> })
const MagnifierPage = dynamic(() => import('@/features/tools/accessibility/pages/MagnifierPage'), { ssr: false, loading: () => <Loading /> })
const FormTemplatesPage = dynamic(() => import('@/features/tools/documents/pages/FormTemplatesPage'), { ssr: false, loading: () => <Loading /> })
const ElectricityPage = dynamic(() => import('@/features/tools/finance/pages/ElectricityPage'), { ssr: false, loading: () => <Loading /> })
const LunarCalendarPage = dynamic(() => import('@/features/tools/vietnam/pages/LunarCalendarPage'), { ssr: false, loading: () => <Loading /> })
const PayrollPage = dynamic(() => import('@/features/tools/finance/pages/PayrollPage'), { ssr: false, loading: () => <Loading /> })
const AddressConversionPage = dynamic(() => import('@/features/tools/vietnam/pages/AddressConversionPage'), { ssr: false, loading: () => <Loading /> })
const FamilyCalendarPage = dynamic(() => import('@/features/tools/family/pages/FamilyCalendarPage'), { ssr: false, loading: () => <Loading /> })
const PdfPasswordPage = dynamic(() => import('@/features/tools/pdf/pages/quick/PdfPasswordPage'), { ssr: false, loading: () => <Loading /> })
const CvPage = dynamic(() => import('@/features/tools/documents/pages/CvPage'), { ssr: false, loading: () => <Loading /> })
const RemoveBackgroundPage = dynamic(() => import('@/features/tools/image/pages/RemoveBackgroundPage'), { ssr: false, loading: () => <Loading /> })
const IdeaSuggestionPage = dynamic(() => import('@/features/tools/community/pages/IdeaSuggestionPage'), { ssr: false, loading: () => <Loading /> })
const RegulationFeedbackPage = dynamic(() => import('@/features/tools/community/pages/RegulationFeedbackPage'), { ssr: false, loading: () => <Loading /> })
const AssistantPage = dynamic(() => import('@/features/tools/byoai/pages/AssistantPage'), { ssr: false, loading: () => <Loading /> })
const CompressVideoPage = dynamic(() => import('@/features/tools/video/pages/CompressVideoPage'), { ssr: false, loading: () => <Loading /> })
const TrimVideoPage = dynamic(() => import('@/features/tools/video/pages/TrimVideoPage'), { ssr: false, loading: () => <Loading /> })
const VideoGifPage = dynamic(() => import('@/features/tools/video/pages/VideoGifPage'), { ssr: false, loading: () => <Loading /> })
const ExtractAudioPage = dynamic(() => import('@/features/tools/video/pages/ExtractAudioPage'), { ssr: false, loading: () => <Loading /> })
export const TOOL_SCREENS: Record<ToolScreen, ComponentType> = {
  'compress-video': CompressVideoPage,
  'trim-video': TrimVideoPage,
  'video-gif': VideoGifPage,
  'extract-audio': ExtractAudioPage,
  editor: DocToolsPage,
  'merge-pdf': MergePdfPage,
  'split-pdf': SplitPdfPage,
  'compress-pdf': CompressPdfPage,
  'convert-file': ConvertFilePage,
  'pdf-to-image': PdfToImagePage,
  'organize-pdf': OrganizePdfPage,
  'page-numbers': PageNumbersPage,
  'stamp-pdf': StampPdfPage,
  'redact-pdf': RedactPdfPage,
  'sign-pdf': SignPdfPage,
  'compare-pdf': ComparePdfPage,
  ocr: OcrPage,
  'image-to-text': ImageToTextPage,
  'images-to-pdf': ImagesToPdfPage,
  'convert-image': ConvertImagePage,
  'compress-image': CompressImagePage,
  'crop-image': CropImagePage,
  'batch-image': BatchImagePage,
  'mark-image': MarkImagePage,
  'id-photo': IdPhotoPage,
  'measure-image': MeasureImagePage,
  'qr-create': QrCreatePage,
  'qr-read': QrReadPage,
  'barcode-create': BarcodeCreatePage,
  'quick-calc': QuickCalcPage,
  'money-calc': MoneyCalcPage,
  'date-calc': DateCalcPage,
  'unit-convert': UnitConvertPage,
  'char-count': CharCountPage,
  color: ColorPage,
  'random-code': RandomCodePage,
  'quick-note': QuickNotePage,
  'house-orientation': HouseOrientationPage,
  'number-words': NumberWordsPage,
  loan: LoanPage,
  'unit-price': UnitPricePage,
  study: StudyPage,
  pomodoro: PomodoroPage,
  'group-split': GroupSplitPage,
  'legacy-font': LegacyFontPage,
  'read-aloud': ReadAloudPage,
  vietqr: VietQrPage,
  'invoice-xml': InvoiceXmlPage,
  'remove-metadata': RemoveMetadataPage,
  collage: CollagePage,
  'message-risk': MessageRiskPage,
  flashcards: FlashcardPage,
  'house-estimate': HouseEstimatePage,
  dictation: DictationPage,
  magnifier: MagnifierPage,
  'form-templates': FormTemplatesPage,
  electricity: ElectricityPage,
  'lunar-calendar': LunarCalendarPage,
  payroll: PayrollPage,
  'address-conversion': AddressConversionPage,
  'family-calendar': FamilyCalendarPage,
  'pdf-password': PdfPasswordPage,
  cv: CvPage,
  'remove-background': RemoveBackgroundPage,
  'idea-suggestion': IdeaSuggestionPage,
  'regulation-feedback': RegulationFeedbackPage,
  assistant: AssistantPage,
}
