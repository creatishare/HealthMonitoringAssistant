import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronLeft, FileText, HelpCircle, Pill, TrendingUp } from 'lucide-react'

const guides = [
  {
    icon: FileText,
    title: '记录健康数据',
    body: '在“记录”页面可以录入体重、血压、尿量和化验指标。建议化验单指标按报告日期录入，日常打卡按当天实际测量时间记录。',
  },
  {
    icon: Pill,
    title: '管理用药提醒',
    body: '在“用药”页面添加药物，设置规格、剂量、频率和提醒时间。首页会自动展示当天待服药事项，点击“已服用”后会生成当天服药记录。',
  },
  {
    icon: TrendingUp,
    title: '查看趋势与报告',
    body: '趋势页可切换指标和周期；“我的-数据导出”会生成近30天复诊报告，方便复诊前整理资料。',
  },
]

const faqs = [
  {
    q: '为什么首页没有显示某个药物？',
    a: '请检查该药物是否处于启用状态，并确认今天符合用药频率。例如隔日一次或每周一次的药物，只会在对应日期展示。',
  },
  {
    q: '数据导出包含哪些内容？',
    a: '报告包含基础档案、最近关键指标、未读预警、今日用药摘要，以及近30天健康记录摘要。',
  },
  {
    q: '健康洞察可以替代医生判断吗？',
    a: '不能。健康洞察只基于已记录数据做统计整理和异常提示，不能替代专业医疗诊断和治疗建议。',
  },
  {
    q: '通知打不开怎么办？',
    a: '先在“提醒设置”中开启消息通知。如果浏览器或系统禁止通知，需要到系统权限设置中重新允许。',
  },
]

export default function HelpCenter() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState(0)

  return (
    <div className="page-shell">
      <div className="page-header-compact">
        <button onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-border bg-white/65 text-gray-text-primary backdrop-blur-xl dark:bg-white/5">
          <ChevronLeft size={20} />
        </button>
        <div>
          <p className="section-kicker">支持</p>
          <h1 className="mt-2 text-page-title text-gray-text-primary">帮助中心</h1>
        </div>
      </div>

      <section className="card">
        <div className="flex items-center gap-2">
          <HelpCircle size={20} className="text-primary" />
          <h2 className="text-card-title text-gray-text-primary">使用指南</h2>
        </div>
        <div className="mt-4 space-y-3">
          {guides.map((guide) => (
            <div key={guide.title} className="rounded-[18px] bg-white/54 p-4 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <guide.icon size={19} />
                </span>
                <p className="text-body font-semibold text-gray-text-primary">{guide.title}</p>
              </div>
              <p className="mt-3 text-helper text-gray-text-secondary">{guide.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="text-card-title text-gray-text-primary">常见问题</h2>
        <div className="mt-4 divide-y divide-gray-border">
          {faqs.map((faq, index) => (
            <div key={faq.q} className="py-3 first:pt-0 last:pb-0">
              <button onClick={() => setOpenFaq(openFaq === index ? -1 : index)} className="flex w-full items-center justify-between gap-3 text-left">
                <span className="text-body font-semibold text-gray-text-primary">{faq.q}</span>
                <ChevronDown size={18} className={`shrink-0 text-gray-text-helper transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === index && <p className="mt-2 text-helper text-gray-text-secondary">{faq.a}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
