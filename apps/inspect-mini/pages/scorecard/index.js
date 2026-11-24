Page({
  data: {
    dimensions: [
      { name: '资质证照', weight: '20%', max: 20, score: 16 },
      { name: '环境卫生', weight: '25%', max: 25, score: 20 },
      { name: '设备设施', weight: '20%', max: 20, score: 15 },
      { name: '服务能力', weight: '20%', max: 20, score: 16 },
      { name: '安全合规', weight: '15%', max: 15, score: 12 },
    ],
    tip: '',
  },
  submit() {
    this.setData({
      tip: '报告已生成占位哈希，待接 KMS + RFC3161 可信时间戳存证。',
    });
  },
});
