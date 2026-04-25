import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, KeyRound, Lock, ShieldCheck } from 'lucide-react'
import { authApi } from '../services/api'
import toast from 'react-hot-toast'

export default function PrivacySecurity() {
  const navigate = useNavigate()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('请填写完整密码信息')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('两次输入的新密码不一致')
      return
    }

    setSaving(true)
    try {
      await authApi.changePassword(oldPassword, newPassword)
      toast.success('密码修改成功')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '密码修改失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-shell">
      <div className="page-header-compact">
        <button onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-border bg-white/65 text-gray-text-primary backdrop-blur-xl dark:bg-white/5">
          <ChevronLeft size={20} />
        </button>
        <div>
          <p className="section-kicker">账号</p>
          <h1 className="mt-2 text-page-title text-gray-text-primary">隐私与安全</h1>
        </div>
      </div>

      <section className="card p-2">
        <button onClick={() => navigate('/privacy-policy')} className="flex w-full items-center justify-between rounded-[20px] p-3 text-left transition-colors hover:bg-white/70 dark:hover:bg-white/5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
              <ShieldCheck size={21} />
            </span>
            <div>
              <p className="text-body font-semibold text-gray-text-primary">隐私政策</p>
              <p className="text-helper text-gray-text-secondary">查看数据收集、使用和保护说明</p>
            </div>
          </div>
          <span className="chip">查看</span>
        </button>
      </section>

      <form onSubmit={handleChangePassword} className="card space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound size={20} className="text-primary" />
          <h2 className="text-card-title text-gray-text-primary">修改登录密码</h2>
        </div>
        <div>
          <label className="mb-2 block text-helper text-gray-text-secondary">当前密码</label>
          <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="mb-2 block text-helper text-gray-text-secondary">新密码</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" placeholder="6-20位，需包含字母和数字" />
        </div>
        <div>
          <label className="mb-2 block text-helper text-gray-text-secondary">确认新密码</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field" />
        </div>
        <button type="submit" disabled={saving} className="btn-primary w-full">
          <Lock size={18} />
          {saving ? '保存中...' : '保存新密码'}
        </button>
      </form>

      <section className="card-alert-info">
        <p className="text-body font-semibold text-gray-text-primary">安全建议</p>
        <p className="mt-2 text-helper text-gray-text-secondary">
          请避免与其他网站共用密码。健康记录、报告和用药信息属于敏感数据，建议定期更新密码并保管好手机验证码。
        </p>
      </section>
    </div>
  )
}
