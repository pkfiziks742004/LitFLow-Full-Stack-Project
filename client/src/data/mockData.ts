import type { Paper, CitationEdge, Collection, AIRecommendation, Notification, User } from '@/types';

export const mockPapers: Paper[] = [
  {
    id: 'p1',
    title: 'Attention Is All You Need',
    authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit', 'Llion Jones', 'Aidan N. Gomez', 'Łukasz Kaiser', 'Illia Polosukhin'],
    year: 2017,
    citations: 154000,
    abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.',
    keywords: ['transformer', 'attention mechanism', 'neural networks', 'NLP', 'deep learning'],
    doi: '10.48550/arXiv.1706.03762',
    category: 'machine-learning',
    journal: 'NeurIPS'
  },
  {
    id: 'p2',
    title: 'BERT: Pre-training of Deep Bidirectional Transformers',
    authors: ['Jacob Devlin', 'Ming-Wei Chang', 'Kenton Lee', 'Kristina Toutanova'],
    year: 2019,
    citations: 149000,
    abstract: 'We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers.',
    keywords: ['BERT', 'NLP', 'transformer', 'pre-training', 'language model'],
    doi: '10.48550/arXiv.1810.04805',
    category: 'machine-learning',
    journal: 'NAACL'
  },
  {
    id: 'p3',
    title: 'Deep Residual Learning for Image Recognition',
    authors: ['Kaiming He', 'Xiangyu Zhang', 'Shaoqing Ren', 'Jian Sun'],
    year: 2016,
    citations: 198000,
    abstract: 'Deep neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously. We explicitly reformulate the layers as learning residual functions with reference to the layer inputs, instead of learning unreferenced functions.',
    keywords: ['ResNet', 'deep learning', 'computer vision', 'CNN', 'image recognition'],
    doi: '10.48550/arXiv.1512.03385',
    category: 'computer-vision',
    journal: 'CVPR'
  },
  {
    id: 'p4',
    title: 'ImageNet Classification with Deep Convolutional Neural Networks',
    authors: ['Alex Krizhevsky', 'Ilya Sutskever', 'Geoffrey E. Hinton'],
    year: 2012,
    citations: 142000,
    abstract: 'We trained a large, deep convolutional neural network to classify the 1.2 million high-resolution images in the ImageNet LSVRC-2010 contest into the 1000 different classes. On the test data, we achieved top-1 and top-5 error rates of 37.5% and 17.0%.',
    keywords: ['AlexNet', 'CNN', 'deep learning', 'ImageNet', 'computer vision'],
    doi: '10.1145/3065386',
    category: 'computer-vision',
    journal: 'NeurIPS'
  },
  {
    id: 'p5',
    title: 'Generative Adversarial Networks',
    authors: ['Ian J. Goodfellow', 'Jean Pouget-Abadie', 'Mehdi Mirza', 'Bing Xu', 'David Warde-Farley', 'Sherjil Ozair', 'Aaron Courville', 'Yoshua Bengio'],
    year: 2014,
    citations: 67000,
    abstract: 'We propose a new framework for estimating generative models via an adversarial process, in which we simultaneously train two models: a generative model G that captures the data distribution, and a discriminative model D that estimates the probability that a sample came from the training data rather than G.',
    keywords: ['GAN', 'generative models', 'deep learning', 'adversarial training'],
    doi: '10.48550/arXiv.1406.2661',
    category: 'machine-learning',
    journal: 'NeurIPS'
  },
  {
    id: 'p6',
    title: 'Adam: A Method for Stochastic Optimization',
    authors: ['Diederik P. Kingma', 'Jimmy Ba'],
    year: 2015,
    citations: 181000,
    abstract: 'We introduce Adam, an algorithm for first-order gradient-based optimization of stochastic objective functions, based on adaptive estimates of lower-order moments. The method is straightforward to implement, is computationally efficient, has little memory requirements, and is well suited for problems that are large in terms of data and/or parameters.',
    keywords: ['Adam', 'optimization', 'gradient descent', 'deep learning', 'SGD'],
    doi: '10.48550/arXiv.1412.6980',
    category: 'optimization',
    journal: 'ICLR'
  },
  {
    id: 'p7',
    title: 'Dropout: A Simple Way to Prevent Neural Networks from Overfitting',
    authors: ['Nitish Srivastava', 'Geoffrey Hinton', 'Alex Krizhevsky', 'Ilya Sutskever', 'Ruslan Salakhutdinov'],
    year: 2014,
    citations: 54000,
    abstract: 'Deep neural networks with a large number of parameters are very powerful machine learning systems. However, overfitting is a serious problem in such networks. Dropout is a technique for addressing this problem. The key idea is to randomly drop units (along with their connections) from the neural network during training.',
    keywords: ['dropout', 'regularization', 'neural networks', 'overfitting', 'deep learning'],
    doi: '10.5555/2627435.2670313',
    category: 'machine-learning',
    journal: 'JMLR'
  },
  {
    id: 'p8',
    title: 'Batch Normalization: Accelerating Deep Network Training',
    authors: ['Sergey Ioffe', 'Christian Szegedy'],
    year: 2015,
    citations: 45000,
    abstract: 'Training Deep Neural Networks is complicated by the fact that the distribution of each layer\'s inputs changes during training, as the parameters of the previous layers change. This slows down the training by requiring lower learning rates and careful parameter initialization. We refer to this phenomenon as internal covariate shift.',
    keywords: ['batch normalization', 'deep learning', 'training', 'CNN', 'optimization'],
    doi: '10.48550/arXiv.1502.03167',
    category: 'optimization',
    journal: 'ICML'
  },
  {
    id: 'p9',
    title: 'Very Deep Convolutional Networks for Large-Scale Image Recognition',
    authors: ['Karen Simonyan', 'Andrew Zisserman'],
    year: 2015,
    citations: 98000,
    abstract: 'In this work we investigate the effect of the convolutional network depth on its accuracy in the large-scale image recognition setting. Our main contribution is a thorough evaluation of networks of increasing depth using an architecture with very small (3×3) convolution filters.',
    keywords: ['VGG', 'CNN', 'deep learning', 'computer vision', 'image recognition'],
    doi: '10.48550/arXiv.1409.1556',
    category: 'computer-vision',
    journal: 'ICLR'
  },
  {
    id: 'p10',
    title: 'Going Deeper with Convolutions',
    authors: ['Christian Szegedy', 'Wei Liu', 'Yangqing Jia', 'Pierre Sermanet', 'Scott Reed', 'Dragomir Anguelov', 'Dumitru Erhan', 'Vincent Vanhoucke', 'Andrew Rabinovich'],
    year: 2015,
    citations: 52000,
    abstract: 'We propose a deep convolutional neural network architecture codenamed Inception, which was responsible for setting the new state of the art for classification and detection in the ImageNet Large-Scale Visual Recognition Challenge 2014 (ILSVRC14).',
    keywords: ['Inception', 'GoogLeNet', 'CNN', 'computer vision', 'deep learning'],
    doi: '10.48550/arXiv.1409.4842',
    category: 'computer-vision',
    journal: 'CVPR'
  },
  {
    id: 'p11',
    title: 'Deep Learning',
    authors: ['Yann LeCun', 'Yoshua Bengio', 'Geoffrey Hinton'],
    year: 2015,
    citations: 58000,
    abstract: 'Deep learning allows computational models that are composed of multiple processing layers to learn representations of data with multiple levels of abstraction. These methods have dramatically improved the state-of-the-art in speech recognition, visual object recognition, object detection and many other domains.',
    keywords: ['deep learning', 'neural networks', 'machine learning', 'AI', 'review'],
    doi: '10.1038/nature14539',
    category: 'machine-learning',
    journal: 'Nature'
  },
  {
    id: 'p12',
    title: 'Playing Atari with Deep Reinforcement Learning',
    authors: ['Volodymyr Mnih', 'Koray Kavukcuoglu', 'David Silver', 'Alex Graves', 'Ioannis Antonoglou', 'Daan Wierstra', 'Martin Riedmiller'],
    year: 2013,
    citations: 28000,
    abstract: 'We present the first deep learning model to successfully learn control policies directly from high-dimensional sensory input using reinforcement learning. The model is a convolutional neural network, trained with a variant of Q-learning, whose input is raw pixels and whose output is a value function estimating future rewards.',
    keywords: ['DQN', 'reinforcement learning', 'deep learning', 'Atari', 'Q-learning'],
    doi: '10.48550/arXiv.1312.5602',
    category: 'reinforcement-learning',
    journal: 'NeurIPS'
  },
  {
    id: 'p13',
    title: 'Mastering the Game of Go with Deep Neural Networks',
    authors: ['David Silver', 'Aja Huang', 'Chris J. Maddison', 'Arthur Guez', 'Laurent Sifre', 'George van den Driessche', 'Julian Schrittwieser', 'Ioannis Antonoglou', 'Veda Panneershelvam', 'Marc Lanctot'],
    year: 2016,
    citations: 19000,
    abstract: 'The game of Go has long been viewed as the most challenging of classic games for artificial intelligence owing to its enormous search space and the difficulty of evaluating board positions and moves. We introduce a new approach to computer Go that uses value networks to evaluate board positions and policy networks to select moves.',
    keywords: ['AlphaGo', 'reinforcement learning', 'deep learning', 'Go', 'Monte Carlo'],
    doi: '10.1038/nature16961',
    category: 'reinforcement-learning',
    journal: 'Nature'
  },
  {
    id: 'p14',
    title: 'A Simple Proof that the p-series Diverges',
    authors: ['Scott Beaver', 'James Wolfe'],
    year: 2020,
    citations: 45,
    abstract: 'We present an elementary proof that the p-series diverges for p ≤ 1 and converges for p > 1 using only basic calculus concepts.',
    keywords: ['calculus', 'series', 'convergence', 'mathematics', 'proof'],
    doi: '10.4169/math.mag.83.1.52',
    category: 'mathematics',
    journal: 'Mathematics Magazine'
  },
  {
    id: 'p15',
    title: 'Climate Change 2021: The Physical Science Basis',
    authors: ['IPCC', 'Valérie Masson-Delmotte', 'Panmao Zhai', 'Anna Pirani', 'Sarah L. Connors', 'Clotilde Péan', 'Sophie Berger', 'Nada Caud', 'Yang Chen', 'Leah Goldfarb'],
    year: 2021,
    citations: 12000,
    abstract: 'The Working Group I contribution to the Sixth Assessment Report addresses the most up-to-date physical understanding of the climate system and climate change, bringing together the latest advances in climate science.',
    keywords: ['climate change', 'global warming', 'IPCC', 'environment', 'science'],
    doi: '10.1017/9781009157896',
    category: 'environmental-science',
    journal: 'IPCC'
  },
  {
    id: 'p16',
    title: 'The CRISPR-Cas9 System for Genome Editing',
    authors: ['Jennifer Doudna', 'Emmanuelle Charpentier'],
    year: 2014,
    citations: 15000,
    abstract: 'The CRISPR-Cas9 system has revolutionized genome editing by providing a simple, programmable method for introducing precise modifications to DNA. This technology has widespread applications in biology, medicine, and agriculture.',
    keywords: ['CRISPR', 'genome editing', 'biotechnology', 'genetics', 'molecular biology'],
    doi: '10.1126/science.1258096',
    category: 'biology',
    journal: 'Science'
  },
  {
    id: 'p17',
    title: 'GPT-3: Language Models are Few-Shot Learners',
    authors: ['Tom B. Brown', 'Benjamin Mann', 'Nick Ryder', 'Melanie Subbiah', 'Jared Kaplan', 'Prafulla Dhariwal', 'Arvind Neelakantan', 'Pranav Shyam', 'Girish Sastry', 'Amanda Askell'],
    year: 2020,
    citations: 35000,
    abstract: 'Recent work has demonstrated substantial gains on many NLP tasks and benchmarks by pre-training on a large corpus of text followed by fine-tuning on a specific task. We demonstrate that scaling up language models greatly improves task-agnostic, few-shot performance.',
    keywords: ['GPT-3', 'language model', 'NLP', 'transformer', 'few-shot learning'],
    doi: '10.48550/arXiv.2005.14165',
    category: 'machine-learning',
    journal: 'NeurIPS'
  },
  {
    id: 'p18',
    title: 'Variational Autoencoders',
    authors: ['Diederik P. Kingma', 'Max Welling'],
    year: 2014,
    citations: 28000,
    abstract: 'We introduce a stochastic variational inference and learning algorithm that scales to large datasets and, under some mild differentiability conditions, even works in the intractable case. Our contributions are two-fold.',
    keywords: ['VAE', 'variational inference', 'generative models', 'deep learning', 'autoencoder'],
    doi: '10.48550/arXiv.1312.6114',
    category: 'machine-learning',
    journal: 'ICLR'
  },
  {
    id: 'p19',
    title: 'Neural Machine Translation by Jointly Learning to Align and Translate',
    authors: ['Dzmitry Bahdanau', 'Kyunghyun Cho', 'Yoshua Bengio'],
    year: 2015,
    citations: 32000,
    abstract: 'Neural machine translation is a recently proposed approach to machine translation. Unlike the traditional statistical machine translation, the neural machine translation aims at building a single neural network that can be jointly tuned to maximize the translation performance.',
    keywords: ['attention', 'neural machine translation', 'NLP', 'seq2seq', 'deep learning'],
    doi: '10.48550/arXiv.1409.0473',
    category: 'nlp',
    journal: 'ICLR'
  },
  {
    id: 'p20',
    title: 'Long Short-Term Memory',
    authors: ['Sepp Hochreiter', 'Jürgen Schmidhuber'],
    year: 1997,
    citations: 89000,
    abstract: 'Learning to store information over extended time intervals by recurrent backpropagation takes a very long time, mostly because of insufficient, decaying error back flow. We briefly review Hochreiter\'s 1991 analysis of this problem, then address it by introducing a novel, efficient, gradient-based method called long short-term memory (LSTM).',
    keywords: ['LSTM', 'RNN', 'neural networks', 'deep learning', 'sequence modeling'],
    doi: '10.1162/neco.1997.9.8.1735',
    category: 'machine-learning',
    journal: 'Neural Computation'
  }
];

export const mockEdges: CitationEdge[] = [
  { source: 'p4', target: 'p3', type: 'cites' },
  { source: 'p3', target: 'p8', type: 'cites' },
  { source: 'p1', target: 'p2', type: 'cites' },
  { source: 'p2', target: 'p17', type: 'cites' },
  { source: 'p1', target: 'p17', type: 'cites' },
  { source: 'p19', target: 'p1', type: 'cites' },
  { source: 'p20', target: 'p19', type: 'cites' },
  { source: 'p11', target: 'p4', type: 'cites' },
  { source: 'p11', target: 'p5', type: 'cites' },
  { source: 'p11', target: 'p6', type: 'cites' },
  { source: 'p6', target: 'p8', type: 'related' },
  { source: 'p7', target: 'p3', type: 'related' },
  { source: 'p9', target: 'p3', type: 'cites' },
  { source: 'p10', target: 'p9', type: 'cites' },
  { source: 'p12', target: 'p11', type: 'cites' },
  { source: 'p13', target: 'p12', type: 'cites' },
  { source: 'p18', target: 'p5', type: 'related' },
  { source: 'p2', target: 'p19', type: 'cites' },
  { source: 'p17', target: 'p1', type: 'cites' },
  { source: 'p3', target: 'p4', type: 'cites' },
  { source: 'p8', target: 'p6', type: 'related' },
  { source: 'p5', target: 'p18', type: 'related' },
  { source: 'p9', target: 'p4', type: 'cites' },
  { source: 'p10', target: 'p3', type: 'cites' },
  { source: 'p20', target: 'p11', type: 'cites' }
];

export const mockCollections: Collection[] = [
  {
    id: 'c1',
    name: 'Deep Learning Fundamentals',
    description: 'Core papers in deep learning',
    paperIds: ['p3', 'p4', 'p6', 'p7', 'p8', 'p11'],
    color: '#3B82F6',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-03-20')
  },
  {
    id: 'c2',
    name: 'Transformer Architecture',
    description: 'Papers about transformer models and attention',
    paperIds: ['p1', 'p2', 'p17', 'p19'],
    color: '#8B5CF6',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-03-18')
  },
  {
    id: 'c3',
    name: 'Computer Vision',
    description: 'Image recognition and CNN papers',
    paperIds: ['p3', 'p4', 'p9', 'p10'],
    color: '#10B981',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-03-15')
  },
  {
    id: 'c4',
    name: 'Reinforcement Learning',
    description: 'RL and game playing agents',
    paperIds: ['p12', 'p13'],
    color: '#F59E0B',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-03-10')
  }
];

export const mockAIRecommendations: AIRecommendation[] = [
  {
    paper: mockPapers[16],
    relevanceScore: 95,
    reason: 'Cited by 4 papers in your collections'
  },
  {
    paper: mockPapers[17],
    relevanceScore: 88,
    reason: 'Related to your Deep Learning Fundamentals collection'
  },
  {
    paper: mockPapers[18],
    relevanceScore: 82,
    reason: 'Similar keywords: attention, transformer'
  },
  {
    paper: mockPapers[19],
    relevanceScore: 78,
    reason: 'Highly cited in machine learning'
  }
];

export const mockNotifications: Notification[] = [
  {
    id: 'n1',
    type: 'new_paper',
    title: 'New paper matching your keywords',
    message: '"GPT-4: Large Scale Language Model" was published and matches your interest in language models.',
    read: false,
    createdAt: new Date('2024-03-20T10:30:00')
  },
  {
    id: 'n2',
    type: 'citation_alert',
    title: 'Your saved paper was cited',
    message: '"Attention Is All You Need" was cited by a new paper on arXiv.',
    read: false,
    createdAt: new Date('2024-03-19T14:22:00')
  },
  {
    id: 'n3',
    type: 'collection_update',
    title: 'Collection updated',
    message: '3 new papers were added to "Deep Learning Fundamentals" collection.',
    read: true,
    createdAt: new Date('2024-03-18T09:15:00')
  }
];

export const mockUser: User = {
  id: 'u1',
  name: 'Dr. Sarah Chen',
  email: 'sarah.chen@university.edu',
  plan: 'FREE',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  institution: 'Stanford University',
  savedPapers: ['p1', 'p2', 'p3', 'p6'],
  collections: ['c1', 'c2', 'c3']
};

export const categories = [
  { id: 'machine-learning', name: 'Machine Learning', color: '#3B82F6' },
  { id: 'computer-vision', name: 'Computer Vision', color: '#10B981' },
  { id: 'nlp', name: 'Natural Language Processing', color: '#8B5CF6' },
  { id: 'reinforcement-learning', name: 'Reinforcement Learning', color: '#F59E0B' },
  { id: 'optimization', name: 'Optimization', color: '#EF4444' },
  { id: 'mathematics', name: 'Mathematics', color: '#06B6D4' },
  { id: 'biology', name: 'Biology', color: '#EC4899' },
  { id: 'environmental-science', name: 'Environmental Science', color: '#84CC16' }
];

export const allAuthors = Array.from(
  new Set(mockPapers.flatMap(p => p.authors))
).sort();

export const allKeywords = Array.from(
  new Set(mockPapers.flatMap(p => p.keywords))
).sort();
