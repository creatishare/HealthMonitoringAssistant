import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据...');

  // 初始化常用药品数据
  const commonMedications = [
    // 免疫抑制剂
    { name: '环孢素软胶囊', category: 'immunosuppressant', commonSpecifications: ['25mg/粒', '50mg/粒'] },
    { name: '他克莫司胶囊', category: 'immunosuppressant', commonSpecifications: ['0.5mg/粒', '1mg/粒'] },
    { name: '雷帕霉素片', category: 'immunosuppressant', commonSpecifications: ['1mg/片'] },
    // 降压药
    { name: '氨氯地平片', category: 'antihypertensive', commonSpecifications: ['5mg/片'] },
    { name: '缬沙坦胶囊', category: 'antihypertensive', commonSpecifications: ['80mg/粒'] },
    // 磷结合剂
    { name: '碳酸镧咀嚼片', category: 'phosphate_binder', commonSpecifications: ['500mg/片'] },
    { name: '司维拉姆片', category: 'phosphate_binder', commonSpecifications: ['800mg/片'] },
    // 促红素
    { name: '重组人促红素注射液', category: 'esa', commonSpecifications: ['3000IU/支', '4000IU/支'] },
    // 其他常用
    { name: '骨化三醇胶囊', category: 'vitamin_d', commonSpecifications: ['0.25μg/粒'] },
    { name: '叶酸片', category: 'supplement', commonSpecifications: ['5mg/片'] },
    { name: '碳酸钙片', category: 'supplement', commonSpecifications: ['600mg/片'] },
  ];

  for (const med of commonMedications) {
    await prisma.commonMedication.upsert({
      where: { id: 1 },
      update: {},
      create: med,
    });
  }

  console.log('常用药品数据初始化完成');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
