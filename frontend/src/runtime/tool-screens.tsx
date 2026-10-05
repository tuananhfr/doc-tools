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
export const TOOL_SCREENS: Record<ToolScreen, ComponentType> = {
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
}
