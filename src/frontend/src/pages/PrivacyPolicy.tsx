import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

interface Section {
  title: string
  content: string[]
}

const sections: Section[] = [
  {
    title: '1. 引言',
    content: [
      '健康监测助手（以下简称"本应用"）非常重视用户的隐私保护。本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息，特别是与健康相关的敏感数据。',
      '请您在使用本应用前仔细阅读本隐私政策。一旦您开始使用本应用，即表示您同意我们按照本政策收集和使用您的信息。',
    ],
  },
  {
    title: '2. 我们收集的信息',
    content: [
      '2.1 账户信息：手机号码、密码（加密存储）等用于身份验证的信息。',
      '2.2 健康数据：您主动录入的血压、体重、肌酐、尿素氮、血钾、血磷、尿酸、血红蛋白等健康指标，以及用药记录、透析记录等医疗相关信息。',
      '2.3 设备信息：设备型号、操作系统版本、IP地址等用于保障服务稳定性和安全性的技术信息。',
      '2.4 使用记录：您使用各项功能的记录，用于优化产品体验和提供个性化服务。',
    ],
  },
  {
    title: '3. 信息的使用目的',
    content: [
      '3.1 提供核心服务：存储和展示您的健康数据，生成趋势图表，提供用药提醒。',
      '3.2 健康预警：基于您录入的数据，当指标超出安全范围时向您发送预警提醒。',
      '3.3 服务优化：分析用户使用情况，持续改进产品功能和用户体验。',
      '3.4 安全保障：防止欺诈、滥用等违法违规行为，保障账户和信息安全。',
    ],
  },
  {
    title: '4. 信息的存储与安全',
    content: [
      '4.1 数据存储：您的所有数据均存储在安全的服务器上，采用业界标准的加密技术进行保护。',
      '4.2 访问控制：只有经过授权的人员才能访问您的数据，且所有访问均有日志记录。',
      '4.3 数据备份：我们定期对数据进行备份，以防止数据丢失。',
      '4.4 安全措施：我们采用SSL/TLS加密传输、防火墙、入侵检测等多重安全措施保护您的数据。',
    ],
  },
  {
    title: '5. 信息的共享与披露',
    content: [
      '5.1 我们不会将您的个人健康数据出售、出租或以其他方式披露给任何第三方用于商业目的。',
      '5.2 在以下情形下，我们可能会披露您的信息：',
      '    · 获得您的明确同意；',
      '    · 根据法律法规要求，或应政府机关、司法机关的合法要求；',
      '    · 为保护本应用或其他用户的合法权益所必需。',
      '5.3 我们可能与第三方服务提供商合作，但仅限于为向您提供服务所必需的范围，且要求合作方遵守不低于本政策的保密义务。',
    ],
  },
  {
    title: '6. 您的权利',
    content: [
      '6.1 访问权：您可以随时查看和编辑您录入的所有健康数据和个人信息。',
      '6.2 删除权：您可以删除您的账户及所有相关数据。删除后，除法律法规另有规定外，您的数据将在合理期限内被彻底清除。',
      '6.3 导出权：您可以将您的健康数据导出为文件，便于您在其他平台使用或备份。',
      '6.4 撤回同意：您可以随时撤回对我们收集和使用您信息的同意，但这可能影响您使用部分功能。',
    ],
  },
  {
    title: '7. 数据保留期限',
    content: [
      '7.1 我们会在您使用本应用期间保留您的数据。',
      '7.2 当您删除账户后，您的数据将在30天内被彻底清除，法律法规另有规定的除外。',
      '7.3 匿名化后的统计数据可能会被保留更长时间，用于医学研究和产品改进，但这些数据无法识别到您个人。',
    ],
  },
  {
    title: '8. 未成年人保护',
    content: [
      '8.1 本应用主要面向成年人使用。如果您是未成年人，请在监护人的指导下使用本应用。',
      '8.2 如果我们发现自己在未获得监护人同意的情况下收集了未成年人的个人信息，将尽快删除相关数据。',
    ],
  },
  {
    title: '9. 政策更新',
    content: [
      '9.1 我们可能会不时更新本隐私政策。更新后的政策将在本应用中公布，并注明更新日期。',
      '9.2 对于重大变更，我们会通过应用内通知或其他方式向您告知。',
      '9.3 请您定期查看本隐私政策，以了解我们如何保护您的信息。',
    ],
  },
  {
    title: '10. 联系我们',
    content: [
      '如果您对本隐私政策有任何疑问、意见或建议，或需要行使您的权利，请通过以下方式联系我们：',
      '邮箱：privacy@healthmonitor.example.com',
      '电话：400-XXX-XXXX',
      '我们将在收到您的请求后15个工作日内予以回复。',
    ],
  },
]

export default function PrivacyPolicy() {
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2" aria-label="back">
          <ChevronLeft size={24} className="text-gray-text-primary" />
        </button>
        <h1 className="text-page-title font-semibold text-gray-text-primary">隐私政策</h1>
      </div>

      {/* 更新日期 */}
      <p className="text-helper text-gray-secondary">
        更新日期：2026年4月18日
      </p>

      {/* 政策内容 */}
      <div className="card space-y-6">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h2 className="text-card-title font-medium text-gray-text-primary">
              {section.title}
            </h2>
            <div className="space-y-2">
              {section.content.map((paragraph, index) => (
                <p
                  key={index}
                  className="text-body text-gray-text-secondary leading-relaxed"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 底部确认 */}
      <div className="card bg-primary-light/30 border border-primary/20">
        <p className="text-body text-primary-dark text-center">
          如您继续使用本应用，即表示您已阅读并同意本隐私政策的全部内容。
        </p>
      </div>
    </div>
  )
}
