import type site from '@/i18n/messages/vi/site.json'

export interface EcosystemItem {
  id: keyof typeof site.ecosystemPage.catalog.items
  logo: string
  href?: string
  featured?: boolean
}

export interface EcosystemGroup {
  id: keyof typeof site.ecosystemPage.catalog.groups
  number: string
  items: EcosystemItem[]
}

/** Nội dung và logo đồng bộ từ pih.vn ngày 31/10/2026. Bản dịch ở site.json. */
export const ECOSYSTEM_GROUPS: EcosystemGroup[] = [
  {
    "id": "doanh-nghiep",
    "number": "01",
    "items": [
      {
        "id": "lpc",
        "logo": "lpc.png",
        "href": "https://lpc.vn/"
      },
      {
        "id": "foodtek",
        "logo": "foodtek.png",
        "href": "https://foodtek.vn/"
      },
      {
        "id": "pizzaHips",
        "logo": "pizza-hips.png",
        "href": "https://pizzahips.com/"
      },
      {
        "id": "lpcFood",
        "logo": "lpc-food.png",
        "href": "https://lpcfood.vn/"
      },
      {
        "id": "erpconsCompany",
        "logo": "erpcons.png",
        "href": "https://erpcons.vn/"
      },
      {
        "id": "tekshotAi",
        "logo": "tekshot-ai-clean-20261030.png",
        "href": "https://tekshot.vn/"
      }
    ]
  },
  {
    "id": "san-pham",
    "number": "02",
    "items": [
      {
        "id": "erpcons",
        "logo": "erpcons.png",
        "href": "https://erpcons.vn/"
      },
      {
        "id": "tekshotOs",
        "logo": "tekshot-os.jpg",
        "href": "https://tekshot.vn/"
      },
      {
        "id": "ubotBuild",
        "logo": "ubot-build-symbol-20261030.jpg",
        "href": "https://ubotbuild.com/"
      },
      {
        "id": "ubot",
        "logo": "ubot-symbol-20261030.png"
      },
      {
        "id": "houseBook",
        "logo": "so-nha-no-circle-20261031.png",
        "href": "https://housebook.erpcons.ai/gioi-thieu"
      },
      {
        "id": "ubotView",
        "logo": "ubot-view-20261031.png",
        "href": "https://ubotview.tekshot.ai/gioi-thieu"
      },
      {
        "id": "ubotConnect",
        "logo": "ubot-connect-extracted-20261031.png",
        "href": "https://ubotconnect.tekshot.ai/gioi-thieu"
      },
      {
        "id": "aloUbot",
        "logo": "alo-ubot-20261031.png",
        "href": "https://aloubot.erpcons.ai/gioi-thieu"
      },
      {
        "id": "piAgent",
        "logo": "pi-agent-original-20261031.jpg"
      }
    ]
  },
  {
    "id": "cong-dong",
    "number": "03",
    "items": [
      {
        "id": "office",
        "logo": "pi-office-20261031.png",
        "href": "https://office.erpcons.vn/"
      },
      {
        "id": "chuyenNho",
        "logo": "chuyen-nho-symbol-20261030.png",
        "href": "https://chuyennho.tekshot.ai/gioi-thieu",
        "featured": true
      },
      {
        "id": "familyCalendar",
        "logo": "lich-gia-dinh-original-20261031.jpg",
        "href": "https://lpc.vn/lich-gia-dinh/"
      },
      {
        "id": "digitalHealth",
        "logo": "suc-khoe-so-20261031.png",
        "href": "https://suckhoeso.tekshot.ai/"
      },
      {
        "id": "businessHealth",
        "logo": "suc-khoe-doanh-nghiep-20261031.png",
        "href": "https://suckhoedoanhnghiep.erpcons.ai/"
      }
    ]
  }
]
