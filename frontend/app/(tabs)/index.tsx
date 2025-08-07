import { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function HomeScreen() {
  const [response, setResponse] = useState('');

  const callFastAPI = async () => {
    try {
      const res = await fetch('http://192.168.219.47:8000/chat?q=테스트'); // ← 너 IP로 바꿔줘!
      const json = await res.json();
      setResponse(json.answer);
    } catch (error) {
      if (error instanceof Error) {
        setResponse('에러 발생 : ' + error.message);
      } else {
        setResponse('알 수 없는 에러 발생');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Button title="FastAPI 호출" onPress={callFastAPI} />
      <Text style={styles.resultText}>{response}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  resultText: {
    marginTop: 20,
    fontSize: 16,
  },
});
